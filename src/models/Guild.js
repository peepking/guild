import { CONSTANTS, ADVENTURER_TYPES } from '../data/constants.js';
import { Adventurer } from './Adventurer.js';

export class Guild {
    constructor() {
        this.money = CONSTANTS.INITIAL_MONEY;
        this.reputation = CONSTANTS.INITIAL_REPUTATION;
        this.day = 1;
        this.softCap = 10; // New: Soft Cap
        this.facilities = {
            extensionLevel: 0, // Guild HQ
            shop: 0,
            tavern: 0,
            training: 0,
            infirmary: 0,
            warehouse: 0,
            library: 0
        }; // Facilities Levels
        this.activeBuffs = [];
        this.financeHistory = []; // Daily Aggregated History [{day, income, expense, balance, details:[]}]
        this.todayFinance = null; // Current day record
        this.retiredAdventurers = []; // Retired/Dead Adventurers

        // Phase 6: Management & Policy
        this.advisors = []; // [{ id, name, roleId, salary, hiredDay }]
        this.advisorCandidates = []; // Subset of retired adventurers eligible for advisor
        this.activePolicy = 'BALANCED'; // Default Policy ID
        this.activeEvents = []; // [{ id, name, remainingDays }]

        // Tournament State
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
