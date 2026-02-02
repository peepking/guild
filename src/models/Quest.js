import { QUEST_MODEL_CONFIG } from '../data/constants.js';

/**
 * クエストモデルクラス
 */
export class Quest {
    /**
     * コンストラクタ
     * @param {string} id - クエストID
     * @param {string} title - タイトル
     * @param {string} type - クエストタイプ (QUEST_TYPES)
     * @param {object} difficulty - 難易度情報 { rank, powerReq ... }
     * @param {object} weights - ステータス重み { STR: 1.0 ... }
     * @param {object} rewards - 報酬 { money, reputation }
     * @param {object} penalty - 重要失敗時の罰則 { money, reputation }
     * @param {number} partySize - 必要人数
     * @param {number} days - 所要日数
     * @param {number} danger - 危険度
     * @param {object} meta - メタデータ { danger01, rewardRate01, prestige01 }
     */
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
        this.expiresInDays = QUEST_MODEL_CONFIG.DEFAULT_EXPIRE_DAYS; // 通常クエストの有効期限

        this.assignedAdventurerIds = [];
        this.lockedByPlayer = false;

        this.guildShareRule = {
            baseGuildShare: QUEST_MODEL_CONFIG.GUILD_SHARE.BASE,
            manualPenaltyShift: QUEST_MODEL_CONFIG.GUILD_SHARE.MANUAL_PENALTY_SHIFT,
            specialNoShift: false
        };
    }
}
