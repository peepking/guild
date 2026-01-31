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

    checkDailyEvents(day, mailService) {
        if (!mailService) return;

        // 1. Adventurer Scout Event (3%) -> DEBUG: 100%
        if (Math.random() < 0.03) {
            this._triggerScoutEvent(day, mailService);
        }

        // 2. Apprenticeship Event (1%)
        if (Math.random() < 0.01) {
            this._triggerApprenticeEvent(day, mailService);
        }
    }

    _triggerScoutEvent(day, mailService) {
        const candidates = [];
        const ranks = ['E', 'D', 'C', 'B'];
        const targetRank = ranks[Math.floor(Math.random() * ranks.length)];

        const allTypes = Object.values(ADVENTURER_TYPES);
        const shuffledTypes = allTypes.sort(() => 0.5 - Math.random());

        for (let i = 0; i < 3; i++) {
            const type = shuffledTypes[i];
            const dummyAdv = this.generateNewAdventurer();
            dummyAdv.type = type;
            const rankMap = { E: 0, D: 80, C: 200, B: 380 };
            dummyAdv.rankValue = rankMap[targetRank] + Math.floor(Math.random() * 20);
            dummyAdv.rankLabel = targetRank;
            dummyAdv.stats = dummyAdv._generateStats(type, dummyAdv.origin, dummyAdv.rankValue);
            candidates.push(dummyAdv);
        }

        const actions = candidates.map((c, idx) => ({
            label: `${c.name}`,
            id: 'SCOUT_ADVENTURER',
            data: { candidate: c }
        }));

        let info = "\n【候補者リスト】\n";
        candidates.forEach(c => {
            info += `・${c.name} (${c.type} / Rank:${c.rankLabel})\n`;
            info += `  出身:${c.origin.name}  評価:${c.rankValue}\n`;
        });
        info += "\n(※スカウトできるのは1名のみです)";

        mailService.send(
            "【噂】有望な冒険者たち",
            `街の酒場で有望な冒険者たちが飲んでいるという噂を聞きました。\n今のうちにスカウトすれば、即戦力として期待できるかもしれません。\n${info}`,
            "EVENT",
            { day, actions }
        );
    }

    _triggerApprenticeEvent(day, mailService) {
        const mentors = this.guild.adventurers.filter(a => a.rankValue >= 380);
        if (mentors.length === 0) return;

        const mentor = mentors[Math.floor(Math.random() * mentors.length)];

        const apprentice = this.generateNewAdventurer();
        apprentice.type = mentor.type;
        apprentice.rankValue = Math.floor(Math.random() * 50); // E Rank
        apprentice.rankLabel = 'E';
        apprentice.stats = apprentice._generateStats(apprentice.type, apprentice.origin, apprentice.rankValue);
        apprentice.name = `弟子${apprentice.name}`;

        const actions = [{
            label: `弟子として受け入れる`,
            id: 'APPRENTICE_JOIN',
            data: { apprentice, mentorId: mentor.id }
        }];

        const body = `${mentor.name}のもとに、弟子入りを志願する者が現れました。\n\n` +
            `名前: ${apprentice.name} (${apprentice.type}/Rank:E)\n` +
            `「${mentor.name}さんのような立派な冒険者になりたいんです！」\n\n` +
            `どうやら本気のようです。許可すれば${mentor.name}も指導を通じて成長するでしょう。`;

        mailService.send(
            "【人事】弟子入りの志願",
            body,
            "EVENT",
            { day, actions }
        );
    }

    executeScout(data) {
        const candidate = data.candidate;
        if (this.guild.adventurers.length >= (this.guild.softCap || 10) + 5) {
            return { success: false, message: '宿舎がいっぱいでスカウトできません' };
        }

        const newAdv = new Adventurer(candidate.id, candidate.name, candidate.type, candidate.origin, JOIN_TYPES.LOCAL, candidate.rankValue);
        newAdv.rankValue = candidate.rankValue; // Explicitly enforce rank value from scout data
        newAdv.lastPeriodRankValue = newAdv.rankValue; // Sync
        newAdv.updateRank(0); // Update label based on enforced rank

        newAdv.stats = candidate.stats;
        newAdv.arts = candidate.arts || [];
        if (newAdv.rankValue >= 380 && newAdv.arts.length < 1) newAdv.learnRandomArt();

        this.guild.adventurers.push(newAdv);
        return { success: true, message: `${newAdv.name}をスカウトしました！` };
    }

    executeApprentice(data) {
        const { apprentice, mentorId } = data;
        const mentor = this.guild.adventurers.find(a => a.id === mentorId);

        const newAdv = new Adventurer(apprentice.id, apprentice.name, apprentice.type, apprentice.origin, JOIN_TYPES.LOCAL, apprentice.rankValue);
        newAdv.rankValue = apprentice.rankValue;
        newAdv.lastPeriodRankValue = newAdv.rankValue; // Sync
        newAdv.updateRank(0);

        newAdv.stats = apprentice.stats;
        this.guild.adventurers.push(newAdv);

        if (mentor) {
            mentor.rankValue += 10;
            mentor.updateRank(0);
        }

        return { success: true, message: `${newAdv.name}が加入し、${mentor ? mentor.name : 'メンター'}の指導熱が高まりました！` };
    }
}
