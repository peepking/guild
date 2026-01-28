export class Quest {
    constructor(id, title, type, difficulty, weights, rewards, penalty, partySize, days, danger, meta) {
        this.id = id;
        this.title = title;
        this.type = type; // QUEST_TYPES
        this.difficulty = difficulty; // { rank: 'E', powerReq: 5 ... }
        this.weights = weights; // { STR: 1.0 ... }
        this.rewards = rewards; // { money: 100, reputation: 5 }
        this.penalty = penalty; // { money: 0, reputation: 10 }
        this.partySize = partySize || 1;
        this.days = days || 1;
        this.danger = danger || 0;
        this.meta = meta || {}; // { danger01, rewardRate01, prestige01 }

        // Phase 12: Manual/Special Extensions
        this.isSpecial = false;
        this.specialKind = null;
        this.manualOnly = false;

        this.createdDay = 1; // Needs to be passed or set by service? Service sets usually.
        this.expiresInDays = 30; // Normal quests last long or recycled?

        this.assignedAdventurerIds = [];
        this.lockedByPlayer = false;

        this.guildShareRule = {
            baseGuildShare: 0.30,
            manualPenaltyShift: 0.10,
            specialNoShift: false
        };
    }
}
