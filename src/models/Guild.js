import { CONSTANTS, ADVENTURER_TYPES } from '../data/constants.js';
import { Adventurer } from './Adventurer.js';

export class Guild {
    constructor() {
        this.money = CONSTANTS.INITIAL_MONEY;
        this.reputation = CONSTANTS.INITIAL_REPUTATION;
        this.day = 1;
        this.softCap = 10; // 新規: ソフトキャップ
        this.facilities = {
            extensionLevel: 0, // ギルド本部
            shop: 0,
            tavern: 0,
            training: 0,
            infirmary: 0,
            warehouse: 0,
            library: 0
        }; // 施設レベル
        this.activeBuffs = [];
        this.financeHistory = []; // 日次集計履歴 [{day, income, expense, balance, details:[]}]
        this.todayFinance = null; // 本日の記録
        this.retiredAdventurers = []; // 引退/死亡した冒険者

        // フェーズ6: 運営 & 方針
        this.advisors = []; // [{ id, name, roleId, salary, hiredDay }]
        this.advisorCandidates = []; // アドバイザー候補（引退済み冒険者）
        this.activePolicy = 'BALANCED'; // デフォルト方針ID
        this.activeEvents = []; // [{ id, name, remainingDays }]
        this.highestRankThreshold = 0; // 最高到達ランクの閾値を記録

        // トーナメント状態
        this.tournament = { solo: 'E', team: 'E' };

        this.adventurers = this._initAdventurers();
        this.logs = [];
    }

    _initAdventurers() {
        return [
            new Adventurer("adv_001", "アレックス", ADVENTURER_TYPES.WARRIOR),
            new Adventurer("adv_002", "ベルト", ADVENTURER_TYPES.MAGE),
            new Adventurer("adv_003", "クリス", ADVENTURER_TYPES.ROGUE),
            new Adventurer("adv_004", "デイジー", ADVENTURER_TYPES.PRIEST)
        ];
    }

    addLog(message) {
        this.logs.push(`[Day ${this.day}] ${message}`);
    }
}
