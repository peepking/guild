import { BASE_STATS, TRAITS, ORIGINS, JOIN_TYPES, ADVENTURER_RANKS } from '../data/constants.js';

export class Adventurer {
    constructor(id, name, type, origin = ORIGINS.CENTRAL, joinType = JOIN_TYPES.LOCAL) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.joinType = joinType;

        // Phase 10: Initialize Rank & Trust based on Origin/JoinType
        this.rankValue = this._initRank(origin, joinType);
        this.rankLabel = this._getRankLabel();

        this.trust = this._initTrust(origin, joinType);

        // Phase 11: Pass rankValue to scale stats
        this.stats = this._generateStats(type, origin, this.rankValue);
        this.temperament = this._generateTemperament();
        this.traits = this._generateTraits();

        this.recoveryDays = 0;
        this.state = "IDLE";

        this.careerDays = 0;
        this.perfEMA = 0;

        this.personalMoney = 0;
        this.equipmentLevel = 0;
        this.equipment = []; // 装備リスト

        // Phase 5: Titles & Legend Records
        this.title = null;
        this.history = []; // { day: N, event: "Did X" }
        // Ensure stats has kills object if not present (though usually stats is flat, maybe add to separate prop?)
        // Let's keep specific counters separate from base stats
        this.records = {
            kills: {}, // { 'GOBLIN': 10, ... }
            quests: {}, // { 'HUNT': 5, ... }
            bossKills: [], // List of boss IDs slain
            majorAchievements: [], // Top 10 quest completions
            majorKills: [] // New: Top 10 monster kills
        };

        // 新メソッド: 装備を追加
        this.addEquipment = function (equip) {
            const WEAPON_TYPES = ['LONG_SWORD', 'SHORT_SWORD', 'AXE', 'MACE', 'STAFF', 'BOW', 'SPECIAL'];
            const ARMOR_TYPES = ['HEAVY', 'LIGHT', 'CLOTHES', 'ROBE'];

            let newCategory = null;
            if (WEAPON_TYPES.includes(equip.type)) newCategory = 'WEAPON';
            else if (ARMOR_TYPES.includes(equip.type)) newCategory = 'ARMOR';

            if (newCategory) {
                // 同じカテゴリの装備を削除 (更新)
                this.equipment = this.equipment.filter(e => {
                    let eCategory = null;
                    if (WEAPON_TYPES.includes(e.type)) eCategory = 'WEAPON';
                    else if (ARMOR_TYPES.includes(e.type)) eCategory = 'ARMOR';
                    return eCategory !== newCategory;
                });
            }
            this.equipment.push(equip);
        };

        // 主要戦績の更新 (Top 10 Kills)
        this.addMajorKill = function (monster, day) {
            // Apply Boss Modifier (+1 Rank equivalent)
            const isBoss = monster.category && (monster.category.includes('ボス') || monster.isBoss);

            // Check for duplicates (Keep first kill)
            if (this.records.majorKills.some(k => k.name === monster.name)) {
                return;
            }

            const RANK_VAL = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1 };
            const rank = monster.rank || 'E';
            let val = RANK_VAL[rank] || 1;

            if (isBoss) val += 1;

            const record = {
                day: day,
                name: monster.name,
                rank: rank,
                isBoss: !!isBoss,
                rankValue: val
            };

            this.records.majorKills.push(record);

            // Sort: Rank Value Desc, then Day Desc
            this.records.majorKills.sort((a, b) => {
                if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
                return b.day - a.day;
            });

            // Keep top 10
            if (this.records.majorKills.length > 10) {
                this.records.majorKills = this.records.majorKills.slice(0, 10);
            }
        };

        // 主要功績の更新 (Top 10)
        this.addMajorAchievement = function (quest, day) {
            // QUEST_RANK_VALUE need to be imported or hardcoded here to sort.
            // Simplified: S=6, A=5, B=4, C=3, D=2, E=1.
            const RANK_VAL = { S: 6, A: 5, B: 4, C: 3, D: 2, E: 1 };
            const rank = quest.difficulty.rank;
            const val = RANK_VAL[rank] || 0;

            const record = {
                day: day,
                title: quest.title,
                rank: rank,
                rankValue: val
            };

            this.records.majorAchievements.push(record);

            // Sort: Rank Desc, then Day Desc (Newer first)
            this.records.majorAchievements.sort((a, b) => {
                if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
                return b.day - a.day;
            });

            // Keep top 10
            if (this.records.majorAchievements.length > 10) {
                this.records.majorAchievements = this.records.majorAchievements.slice(0, 10);
            }
        };
        // 装備レベルアップ（所持金消費）
        this.upgradeEquipment = function (cost) {
            if (this.personalMoney >= cost) {
                this.personalMoney -= cost;
                this.equipmentLevel = (this.equipmentLevel || 0) + 1;
                return true;
            }
            return false;
        };

        // 履歴追加メソッド
        this.addHistory = function (day, text) {
            this.history.push({ day, text });
        };
    }

    _initRank(origin, joinType) {
        // 4.1 JoinType Base
        let min = 0, max = 100;
        if (joinType === JOIN_TYPES.LOCAL) { min = 0; max = 160; }
        else if (joinType === JOIN_TYPES.WANDERER) { min = 0; max = 650; }
        else if (joinType === JOIN_TYPES.CONTRACT) { min = 350; max = 900; }

        let val = Math.floor(Math.random() * (max - min)) + min;

        // 4.2 Origin Bonus
        if (origin.id === 'central') val += 30;
        else if (origin.id === 'foreign') val -= 40;
        else val += 10;

        // 4.3 Clamp
        if (val < 0) val = 0;
        if (val > 1000) val = 1000;
        return val;
    }

    _initTrust(origin, joinType) {
        // 5. Initial Trust
        let base = origin.trust || 0;

        let bonus = 0;
        if (joinType === JOIN_TYPES.LOCAL) bonus = 15;
        else if (joinType === JOIN_TYPES.WANDERER) bonus = 0;
        else if (joinType === JOIN_TYPES.CONTRACT) bonus = -15;

        return Math.max(0, base + bonus);
    }

    _getRankLabel() {
        for (const r of ADVENTURER_RANKS) {
            if (this.rankValue >= r.threshold) return r.label;
        }
        return 'E';
    }

    updateRank(delta) {
        this.rankValue += delta;
        if (this.rankValue < 0) this.rankValue = 0;
        if (this.rankValue > 1000) this.rankValue = 1000;
        this.rankLabel = this._getRankLabel();
    }

    _generateStats(type, origin, rankValue) {
        const base = BASE_STATS[type];
        const stats = {};

        // 3.1 & 3.2 Rank Factor
        const t = rankValue / 1000; // 0..1
        // factor = 0.88 + 0.70 * (t^1.6)
        const rankFactor = 0.88 + 0.70 * Math.pow(t, 1.6);

        // 4.2 Variance Rate (Higher rank = less variance)
        // 0.10 - 0.04 * t -> E: 10%, S: 6%
        const varianceRate = 0.10 - 0.04 * t;

        for (const [key, val0] of Object.entries(base)) {
            // 4.1 Base Scaling
            let val = val0 * rankFactor;

            // 4.2 Variance
            const variance = val * varianceRate * (Math.random() * 2 - 1);
            val += variance;

            // 4.3 Origin Mod
            const mod = origin.statMod || {};
            if (mod[key]) val += mod[key];

            // 4.4 Foreign Weakener (rare boost per spec logic)
            if (origin.id === 'foreign' && Math.random() < 0.2) {
                val += 3;
            }

            // 4.5 Rounding
            stats[key] = Math.max(1, Math.round(val));
        }

        // 5. Min Stat Guard (Insurance)
        this._applyMinStatGuard(stats, base, rankFactor);

        return stats;
    }

    _applyMinStatGuard(stats, baseStats, rankFactor) {
        // 5.1 Sums
        let sum = 0;
        let baseSum = 0;
        for (const v of Object.values(stats)) sum += v;
        for (const v of Object.values(baseStats)) baseSum += v;

        // 5.2 Min Threshold
        // 92% of expected rank average
        const minSum = baseSum * rankFactor * 0.92;

        // 5.3 Redistribute
        let need = minSum - sum;
        if (need > 0) {
            need = Math.ceil(need);
            // Cap guard to avoid infinite loops if config is weird
            let safety = 20;
            while (need > 0 && safety > 0) {
                // Find lowest stat to boost
                let minKey = null;
                let minVal = 9999;
                for (const [k, v] of Object.entries(stats)) {
                    if (v < minVal) { minVal = v; minKey = k; }
                }

                if (minKey) {
                    stats[minKey] += 1;
                    need--;
                }
                safety--;
            }
        }
    }

    _generateTemperament() {
        return {
            risk: Math.floor(Math.random() * 5) - 2,
            greed: Math.floor(Math.random() * 5) - 2,
            social: Math.floor(Math.random() * 5) - 2
        };
    }

    _generateTraits() {
        const traitKeys = Object.keys(TRAITS);
        const count = Math.floor(Math.random() * 2) + 1; // 1 or 2 traits
        const traits = [];
        for (let i = 0; i < count; i++) {
            const t = traitKeys[Math.floor(Math.random() * traitKeys.length)];
            if (!traits.includes(t)) traits.push(t);
        }
        return traits;
    }

    isAvailable() {
        return this.state === "IDLE" && this.recoveryDays <= 0;
    }
}
