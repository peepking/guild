import { CONSTANTS, ADVENTURER_TYPES } from '../data/constants.js';
import { Adventurer } from './Adventurer.js';

/**
 * ギルドの資産、施設、人員を管理するメインモデル
 */
export class Guild {
    /**
     * コンストラクタ
     */
    constructor() {
        /** @type {number} 現在の所持金 */
        this.money = CONSTANTS.INITIAL_MONEY;
        /** @type {number} ギルドの評判（ランクに影響） */
        this.reputation = CONSTANTS.INITIAL_REPUTATION;
        /** @type {number} 経過日数 */
        this.day = 1;
        /** @type {number} 冒険者数のソフトキャップ（目安） */
        this.softCap = CONSTANTS.GUILD.SOFT_CAP;

        /** @type {object} 施設レベル管理 */
        this.facilities = {
            extensionLevel: 0, // ギルド本部
            shop: 0,
            tavern: 0,
            training: 0,
            infirmary: 0,
            warehouse: 0,
            library: 0
        };

        this.activeBuffs = [];

        /** @type {object} 今日の収支情報 */
        this.todayFinance = {
            day: this.day,
            income: 0,
            expense: 0,
            balance: this.money,
            details: []
        };

        /** @type {Array<object>} 過去の収支履歴（最新1000件） */
        this.financeHistory = [this.todayFinance];
        /** @type {Array<Adventurer>} 引退/死亡した冒険者リスト */
        this.retiredAdventurers = [];

        // フェーズ6: 運営 & 方針
        this.advisors = []; // [{ id, name, roleId, salary, hiredDay }]
        this.advisorCandidates = []; // アドバイザー候補（引退済み冒険者）
        this.activePolicy = 'BALANCED'; // デフォルト方針ID
        this.activeEvents = []; // [{ id, name, remainingDays }]
        this.highestRankThreshold = 0; // 最高到達ランクの閾値を記録

        // トーナメント状態
        this.tournament = { solo: 'E', team: 'E' };

        /** @type {Array<Adventurer>} 所属冒険者リスト */
        this.adventurers = this._initAdventurers();
        this.logs = [];
    }

    /**
     * 初期冒険者メンバーを生成します。
     * @returns {Array<Adventurer>} 初期メンバーのリスト
     * @private
     */
    _initAdventurers() {
        return [
            new Adventurer("adv_001", "アレックス", ADVENTURER_TYPES.WARRIOR),
            new Adventurer("adv_002", "ベルト", ADVENTURER_TYPES.MAGE),
            new Adventurer("adv_003", "クリス", ADVENTURER_TYPES.ROGUE),
            new Adventurer("adv_004", "デイジー", ADVENTURER_TYPES.PRIEST)
        ];
    }

    /**
     * ログを追加します。
     * @param {string} message - ログメッセージ
     * @returns {void}
     */
    addLog(message) {
        this.logs.push(`[Day ${this.day}] ${message}`);
    }
}
