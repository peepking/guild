import { Adventurer } from '../models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS, JOIN_TYPES } from '../data/constants.js';
import { REGIONAL_NAMES } from '../data/Names.js';

export class RecruitmentService {
    constructor(guild) {
        this.guild = guild;
        this.counter = 1000;
    }

    dailyRecruit() {
        // 1. Process Active Buffs (Remove expired)
        this.guild.activeBuffs = this.guild.activeBuffs.filter(buff => buff.expiresDay > this.guild.day);

        const prBuff = this.guild.activeBuffs.find(b => b.type === 'PR_CAMPAIGN');
        let buffMod = 1.0;
        if (prBuff) {
            buffMod = prBuff.effect; // e.g., 1.5 or 2.0
        }

        // 2. Base Check
        // Spec: 0.05 + rep factor
        const rep = this.guild.reputation;
        let chance = (0.05 + (rep * 0.0003)) * 3.0; // Tripled base

        // Apply Buff
        chance *= buffMod;

        // 3. Soft Cap Logic
        const count = this.guild.adventurers.length;
        const cap = this.guild.softCap || 10;

        if (count >= cap) {
            // Soft Limit: 50% chance
            chance *= 0.5;

            // Saturation: 1.5x Cap -> 10% chance
            if (count >= Math.floor(cap * 1.5)) {
                chance *= 0.2; // Severely reduced
            }
        }

        // Debug Log (can be removed later or keep for tuning)
        // console.log(`Recruit Check: Chance=${chance.toFixed(3)} (Count:${count}/${cap}, Buff:${buffMod})`);

        if (Math.random() < chance) {
            return this.generateNewAdventurer();
        }
        return null;
    }

    generateNewAdventurer() {
        this.counter++;
        const id = `adv_${this.counter}`;

        // Random Type
        const types = Object.values(ADVENTURER_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        // Random Origin
        const origins = Object.values(ORIGINS);
        const origin = origins[Math.floor(Math.random() * origins.length)];

        // Select Name List based on Origin
        let regionKey = 'CENTRAL'; // Fallback

        switch (origin.id) {
            case 'north': regionKey = 'NORTH'; break;
            case 'south': regionKey = 'SOUTH'; break;
            case 'east': regionKey = 'EAST'; break;
            case 'west': regionKey = 'WEST'; break;
            default:
                // Central or Foreign: Pick random culture
                const keys = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                regionKey = keys[Math.floor(Math.random() * keys.length)];
                break;
        }

        const nameList = REGIONAL_NAMES[regionKey];
        const name = nameList[Math.floor(Math.random() * nameList.length)];

        // Phase 10: Join Type Logic
        // Select Join Type first? Or random?
        // Weights: Local 40%, Wanderer 40%, Contract 20%
        const roll = Math.random();
        let joinType = JOIN_TYPES.LOCAL;
        if (roll < 0.4) joinType = JOIN_TYPES.LOCAL;
        else if (roll < 0.8) joinType = JOIN_TYPES.WANDERER;
        else joinType = JOIN_TYPES.CONTRACT;

        // Create with all params
        const adv = new Adventurer(id, name, type, origin, joinType);

        return adv;
    }

    // Verification method for "100 templates"
    generateTemplateBatch(count = 100, originId = null) {
        const results = [];
        for (let i = 0; i < count; i++) {
            this.counter++;
            const id = `test_${this.counter}`;
            const types = Object.values(ADVENTURER_TYPES);
            const type = types[Math.floor(Math.random() * types.length)];

            let origin = ORIGINS.CENTRAL;
            if (originId) {
                // Find by ID match
                origin = Object.values(ORIGINS).find(o => o.id === originId) || ORIGINS.CENTRAL;
            } else {
                const origins = Object.values(ORIGINS);
                origin = origins[Math.floor(Math.random() * origins.length)];
            }

            const adv = new Adventurer(id, `TestUnit_${i}`, type, origin);
            results.push(adv);
        }
        return results;
    }
}
