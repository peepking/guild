import { Adventurer } from '../models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS, JOIN_TYPES, GUILD_RANK_THRESHOLDS, ADVENTURER_RANKS } from '../data/constants.js';
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

        // 2. Base Check (Modified for PUBLIC_RELATIONS)
        const prLv = (this.guild.facilities && this.guild.facilities.public_relations) || 0;

        // Base: 1% + 3% per Level. Max (Lv5) = 16% + Rep Bonus
        // Old formula was approx 15-20%.
        let chance = 0.01 + (prLv * 0.03);

        // Small Rep Bonus (0.01% per 200 Rep)
        chance += this.guild.reputation * 0.00005;

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

        // Determine Max Rank Value based on Guild Reputation
        const guildRep = (this.guild && this.guild.reputation) || 0;
        const guildRankObj = GUILD_RANK_THRESHOLDS.find(r => guildRep >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];

        // Find corresponding Adventurer Rank index
        // Assuming labels match (S, A, B, C, D, E)
        const advRankIdx = ADVENTURER_RANKS.findIndex(r => r.label === guildRankObj.label);

        let maxRankValue = 9999;
        if (advRankIdx > 0) {
            // Cap to just below the NEXT rank threshold
            // e.g. if C (idx 3), next is B (idx 2). Cap = B.threshold - 1.
            const nextRank = ADVENTURER_RANKS[advRankIdx - 1];
            maxRankValue = nextRank.threshold - 1;
        }

        // Create with all params
        const adv = new Adventurer(id, name, type, origin, joinType, maxRankValue);

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
