import { TRAITS } from '../data/constants.js';
import { EquipmentService } from '../services/EquipmentService.js';

export class LifeEventService {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.equipmentService = new EquipmentService();
    }

    processLifeEvents(guild) {
        // 回復中でないIDLE状態の冒険者をフィルタ
        const candidates = guild.adventurers.filter(a => a.state === 'IDLE' && a.recoveryDays <= 0);

        candidates.forEach(adv => {
            // 1. 日次の装備購入
            this._processShopping(adv);

            // 2. イベント発生確率: 標準で日次10%
            if (Math.random() < 0.1) {
                this._rollEvent(adv, guild);
            }
        });
    }

    _processShopping(adv) {
        // 資金がある場合の基本購入確率: 30% (20%から増加)
        let shopChance = 0.3;

        const traits = adv.traits || [];
        // 特性による補正
        if (traits.includes('spender')) shopChance += 0.4; // 高確率
        if (traits.includes('frugal')) shopChance -= 0.15; // 低確率
        if (traits.includes('greedy')) shopChance -= 0.1;  // 貯金優先
        if (traits.includes('gourmet')) shopChance += 0.1; // 浪費家
        if (traits.includes('noble')) shopChance += 0.1;   // 品質重視

        if (Math.random() < shopChance) {
            const result = this.equipmentService.upgradeEquipment(adv);
            if (result.success) {
                this.uiManager.log(`${adv.name} は貯めたお金で装備「${result.equipment.name}」を購入しました。(費用:${result.cost}G)`, 'info');
            }
        }
    }

    _rollEvent(adv, guild) {
        // 特性チェック
        const traits = adv.traits || [];

        // 特性ベースのイベントを優先
        if (traits.includes('drunkard') && Math.random() < 0.3) {
            this._eventDrunkard(adv);
            return;
        }
        if (traits.includes('spender') && Math.random() < 0.3) {
            this._eventSpender(adv);
            return;
        }
        if (traits.includes('troublemaker') && Math.random() < 0.2) {
            this._eventTrouble(adv, guild);
            return;
        }

        if (traits.includes('mediator') && Math.random() < 0.2) {
            this._eventMediator(adv, guild);
            return;
        }
        if (traits.includes('glutton') && Math.random() < 0.2) {
            this._eventGlutton(adv);
            return;
        }

        // 一般的な交流
        // (将来の課題)
    }

    // --- Specific Events ---

    _eventDrunkard(adv) {
        adv.trust = Math.max(0, adv.trust - 2);
        adv.recoveryDays = 1; // 軽傷 (二日酔い/喧嘩)
        // 軽傷 (二日酔い/喧嘩)
        adv.state = "IDLE"; // IDLEままだが回復中
        // IDLEままだが回復中
        this.uiManager.log(`${adv.name} は酒場で大暴れし、二日酔いで動けません。(信頼度低下)`, 'warning');
    }

    _eventSpender(adv) {
        // EquipmentServiceを使用してアップグレードを試行
        const result = this.equipmentService.upgradeEquipment(adv);
        if (result.success) {
            this.uiManager.log(`${adv.name} は装備「${result.equipment.name}」を取得し、レベル${adv.equipmentLevel}に上がりました。(費用:${result.cost}G)`, 'info');
        } else {
            // アップグレード失敗時のフォールバック
            this.uiManager.log(`${adv.name} は街で豪遊しています。`, 'info');
        }
    }

    _eventTrouble(adv, guild) {
        const fine = 100;
        if (guild.money >= fine) {
            guild.money -= fine;
            adv.trust -= 5;
            this.uiManager.log(`${adv.name} が街で揉め事を起こし、ギルドが示談金(${fine}G)を支払いました。`, 'error');
        } else {
            this.uiManager.log(`${adv.name} が街で揉め事を起こしましたが、ギルドに金がなく放置されました。(評判低下)`, 'error');
            guild.reputation -= 2;
        }
    }

    _eventMediator(adv, guild) {
        if (Math.random() < 0.5) {
            adv.trust += 1;
            this.uiManager.log(`${adv.name} は冒険者同士の喧嘩を仲裁し、信頼を得ました。`, 'success');
        } else {
            guild.reputation += 1;
            this.uiManager.log(`${adv.name} は街の揉め事を仲裁し、ギルドの評判を上げました。`, 'success');
        }
    }

    _eventGlutton(adv) {
        if (adv.personalMoney > 100) {
            adv.personalMoney -= 100;
            // 一時的なバフロジックの可能性 (現在は省略)
            this.uiManager.log(`${adv.name} は美食にお金を使っています。`, 'info');
        } else {
            this.uiManager.log(`${adv.name} は腹を空かせて食堂を覗いています...`, 'info');
        }
    }
}
