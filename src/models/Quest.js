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

        // フェーズ12: 手動/特殊拡張
        this.isSpecial = false;
        this.specialKind = null;
        this.manualOnly = false;

        this.createdDay = 1; // サービスによって設定される必要があります（通常はサービスが設定）
        this.expiresInDays = 30; // 通常クエストの有効期限

        this.assignedAdventurerIds = [];
        this.lockedByPlayer = false;

        this.guildShareRule = {
            baseGuildShare: 0.30,
            manualPenaltyShift: 0.10,
            specialNoShift: false
        };
    }
}
