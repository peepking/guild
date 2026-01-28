import { TRAITS } from '../data/constants.js';
import { EquipmentService } from '../services/EquipmentService.js';

export class LifeEventService {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.equipmentService = new EquipmentService();
    }

    processLifeEvents(guild) {
        // Filter IDLE adventurers who are not recovering
        const candidates = guild.adventurers.filter(a => a.state === 'IDLE' && a.recoveryDays <= 0);

        candidates.forEach(adv => {
            // 1. Daily Equipment Shopping
            this._processShopping(adv);

            // 2. Chance for event: 10% per day standard
            if (Math.random() < 0.1) {
                this._rollEvent(adv, guild);
            }
        });
    }

    _processShopping(adv) {
        // Base chance to shop if money allows: 30% (Increased from 20%)
        let shopChance = 0.3;

        const traits = adv.traits || [];
        // Trait Modifiers
        if (traits.includes('spender')) shopChance += 0.4; // High chance
        if (traits.includes('frugal')) shopChance -= 0.15; // Low chance
        if (traits.includes('greedy')) shopChance -= 0.1;  // Hoards money
        if (traits.includes('gourmet')) shopChance += 0.1; // Likes spending
        if (traits.includes('noble')) shopChance += 0.1;   // Quality checks

        if (Math.random() < shopChance) {
            const result = this.equipmentService.upgradeEquipment(adv);
            if (result.success) {
                this.uiManager.log(`${adv.name} は貯めたお金で装備「${result.equipment.name}」を購入しました。(費用:${result.cost}G)`, 'info');
            }
        }
    }

    _rollEvent(adv, guild) {
        // Check traits
        const traits = adv.traits || [];

        // Priority to Trait-based events
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

        // Generic Interaction
        // ... (Future work)
    }

    // --- Specific Events ---

    _eventDrunkard(adv) {
        adv.trust = Math.max(0, adv.trust - 2);
        adv.recoveryDays = 1; // Minor injury (hangover/brawl)
        adv.state = "IDLE"; // Still Idle but recovering
        this.uiManager.log(`${adv.name} は酒場で大暴れし、二日酔いで動けません。(信頼度低下)`, 'warning');
    }

    _eventSpender(adv) {
        // Use EquipmentService to attempt an upgrade
        const result = this.equipmentService.upgradeEquipment(adv);
        if (result.success) {
            this.uiManager.log(`${adv.name} は装備「${result.equipment.name}」を取得し、レベル${adv.equipmentLevel}に上がりました。(費用:${result.cost}G)`, 'info');
        } else {
            // Fallback behavior when upgrade fails
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
            // Potential temporary buff logic here (omitted for now)
            this.uiManager.log(`${adv.name} は美食にお金を使っています。`, 'info');
        } else {
            this.uiManager.log(`${adv.name} は腹を空かせて食堂を覗いています...`, 'info');
        }
    }
}
