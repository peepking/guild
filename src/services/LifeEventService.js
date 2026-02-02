import { TRAITS, LIFE_EVENT_CONFIG } from '../data/constants.js';
import { EquipmentService } from '../services/EquipmentService.js';

/**
 * 冒険者の生活イベント（買い物、トラブル、交流）を管理するサービス
 */
export class LifeEventService {
    /**
     * コンストラクタ
     * @param {object} uiManager - UIマネージャー
     * @param {EquipmentService} equipmentService - 装備サービス
     */
    constructor(uiManager, equipmentService) {
        this.uiManager = uiManager;
        this.equipmentService = equipmentService || new EquipmentService();
    }

    /**
     * 日次の生活イベントを処理します。
     * @param {object} guild - ギルドモデル
     */
    processLifeEvents(guild) {
        // 回復中でないIDLE状態の冒険者をフィルタ
        const candidates = guild.adventurers.filter(a => a.state === 'IDLE' && a.recoveryDays <= 0);

        candidates.forEach(adv => {
            // 1. 日次の装備購入
            this._processShopping(adv);

            // 2. イベント発生確率: 標準で日次10%
            if (Math.random() < LIFE_EVENT_CONFIG.EVENT_CHANCE) {
                this._rollEvent(adv, guild);
            }
        });
    }

    /**
     * 装備購入処理（買い物）を行います。
     * @param {Adventurer} adv - 対象冒険者
     * @private
     */
    _processShopping(adv) {
        // 資金がある場合の基本購入確率: 30% (20%から増加)
        let shopChance = LIFE_EVENT_CONFIG.SHOPPING_CHANCE.BASE;

        const traits = adv.traits || [];
        // 特性による補正
        const mods = LIFE_EVENT_CONFIG.SHOPPING_CHANCE.MODIFIERS;
        if (traits.includes('spender')) shopChance += mods.SPENDER; // 高確率
        if (traits.includes('frugal')) shopChance += mods.FRUGAL; // 低確率
        if (traits.includes('greedy')) shopChance += mods.GREEDY;  // 貯金優先
        if (traits.includes('gourmet')) shopChance += mods.GOURMET; // 浪費家
        if (traits.includes('noble')) shopChance += mods.NOBLE;   // 品質重視

        if (Math.random() < shopChance) {
            const result = this.equipmentService.upgradeEquipment(adv);
            if (result.success) {
                this.uiManager.log(`${adv.name} は貯めたお金で装備「${result.equipment.name}」を購入しました。(費用:${result.cost}G)`, 'info');
            }
        }
    }

    /**
     * ランダムな生活イベントを発生させます。
     * @param {Adventurer} adv - 対象冒険者
     * @param {object} guild - ギルドモデル
     * @private
     */
    _rollEvent(adv, guild) {
        // 特性チェック
        const traits = adv.traits || [];
        const probs = LIFE_EVENT_CONFIG.EVENT_PROBS;

        // 特性ベースのイベントを優先
        if (traits.includes('drunkard') && Math.random() < probs.DRUNKARD) {
            this._eventDrunkard(adv);
            return;
        }
        if (traits.includes('spender') && Math.random() < probs.SPENDER) {
            this._eventSpender(adv);
            return;
        }
        if (traits.includes('troublemaker') && Math.random() < probs.TROUBLE) {
            this._eventTrouble(adv, guild);
            return;
        }

        if (traits.includes('mediator') && Math.random() < probs.MEDIATOR) {
            this._eventMediator(adv, guild);
            return;
        }
        if (traits.includes('glutton') && Math.random() < probs.GLUTTON) {
            this._eventGlutton(adv);
            return;
        }

        // 一般的な交流
        // (将来の課題)
    }

    // --- Specific Events ---

    /**
     * イベント: 酔っ払い
     * @param {Adventurer} adv 
     * @private
     */
    _eventDrunkard(adv) {
        adv.trust = Math.max(0, adv.trust - 2);
        adv.recoveryDays = 1; // 軽傷 (二日酔い/喧嘩)
        adv.state = "IDLE"; // IDLEままだが回復中
        this.uiManager.log(`${adv.name} は酒場で大暴れし、二日酔いで動けません。(信頼度低下)`, 'warning');
    }

    /**
     * イベント: 浪費家
     * @param {Adventurer} adv 
     * @private
     */
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

    /**
     * イベント: トラブルメーカー
     * @param {Adventurer} adv 
     * @param {object} guild 
     * @private
     */
    _eventTrouble(adv, guild) {
        const fine = LIFE_EVENT_CONFIG.FINES.TROUBLE;
        if (guild.money >= fine) {
            guild.money -= fine;
            adv.trust -= 5;
            this.uiManager.log(`${adv.name} が街で揉め事を起こし、ギルドが示談金(${fine}G)を支払いました。`, 'error');
        } else {
            this.uiManager.log(`${adv.name} が街で揉め事を起こしましたが、ギルドに金がなく放置されました。(評判低下)`, 'error');
            guild.reputation -= 2;
        }
    }

    /**
     * イベント: 仲裁者
     * @param {Adventurer} adv 
     * @param {object} guild 
     * @private
     */
    _eventMediator(adv, guild) {
        if (Math.random() < 0.5) {
            adv.trust += 1;
            this.uiManager.log(`${adv.name} は冒険者同士の喧嘩を仲裁し、信頼を得ました。`, 'success');
        } else {
            guild.reputation += 1;
            this.uiManager.log(`${adv.name} は街の揉め事を仲裁し、ギルドの評判を上げました。`, 'success');
        }
    }

    /**
     * イベント: 大食漢
     * @param {Adventurer} adv 
     * @private
     */
    _eventGlutton(adv) {
        const cost = LIFE_EVENT_CONFIG.COSTS.GLUTTON;
        if (adv.personalMoney > cost) {
            adv.personalMoney -= cost;
            // 一時的なバフロジックの可能性 (現在は省略)
            this.uiManager.log(`${adv.name} は美食にお金を使っています。`, 'info');
        } else {
            this.uiManager.log(`${adv.name} は腹を空かせて食堂を覗いています...`, 'info');
        }
    }
}
