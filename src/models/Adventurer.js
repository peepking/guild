import { BASE_STATS, TRAITS, ORIGINS, JOIN_TYPES, ADVENTURER_RANKS } from '../data/constants.js';
import { ARTS_DATA } from '../data/ArtsData.js';
import { INTRO_TEMPLATES, ARTS_TEMPLATES, TRAIT_TEMPLATES, CAREER_TEMPLATES, NICKNAME_TEMPLATES, FLAVOR_TEMPLATES } from '../data/BioData.js';
import { ADVENTURER_TYPES } from '../data/constants.js';

export class Adventurer {
    constructor(id, name, type, origin = ORIGINS.CENTRAL, joinType = JOIN_TYPES.LOCAL, maxRankValue = 9999) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.origin = origin;
        this.joinType = joinType;

        // フェーズ10: 原点/加入タイプに基づくランクと信頼度の初期化
        this.rankValue = this._initRank(origin, joinType, maxRankValue);
        this.lastPeriodRankValue = this.rankValue; // 期間評価追跡用スナップショット
        this.rankLabel = this._getRankLabel();

        this.trust = this._initTrust(origin, joinType);

        // フェーズ11: ランク値を渡してステータスをスケーリング
        this.stats = this._generateStats(type, origin, this.rankValue);
        this.temperament = this._generateTemperament();
        this.traits = this._generateTraits();
        this.arts = [];

        // 名鑑データ (Meikan Bio)
        this.bio = {
            intro: "",
            arts: [],
            traits: [],
            career: [],
            nickname: "",
            flavor: ""
        };

        // 初期バイオ生成
        this.updateBio('INTRO');
        this.updateBio('TRAITS');

        this.recoveryDays = 0;
        this.state = "IDLE";

        this.careerDays = 0;
        this.perfEMA = 0;

        this.personalMoney = 0;
        this.equipmentLevel = 0;
        this.equipment = []; // 装備リスト

        // フェーズ5: 二つ名 & 伝説の記録
        this.title = null;
        this.history = []; // { day: N, event: "Did X" }
        // 特定のカウンターは基本ステータスとは別に保持
        this.records = {
            kills: {}, // { 'GOBLIN': 10, ... }
            quests: {}, // { 'HUNT': 5, ... }
            bossKills: [], // 討伐したボスIDリスト
            majorAchievements: [], // クエスト完了トップ10
            majorKills: [] // モンスター討伐トップ10
        };

        // 初回アーツ習得チェック
        if (this.rankValue >= 380) this.learnRandomArt();
        if (this.rankValue >= 1000) this.learnRandomArt();
    }

    addEquipment(equip) {
        const WEAPON_TYPES = ['LONG_SWORD', 'SHORT_SWORD', 'AXE', 'MACE', 'STAFF', 'BOW', 'SPECIAL', 'GAUNTLET'];
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
    }

    addMajorKill(monster, day) {
        // ボス補正を適用 (+1 ランク相当)
        const isBoss = monster.category && (monster.category.includes('ボス') || monster.isBoss);

        // 重複チェック (初回の討伐を保持)
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

        // ソート: ランク値の降順、次に日付の降順
        this.records.majorKills.sort((a, b) => {
            if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
            return b.day - a.day;
        });

        // トップ10を保持
        if (this.records.majorKills.length > 10) {
            this.records.majorKills = this.records.majorKills.slice(0, 10);
        }
    }

    // 主要功績の更新 (Top 10)
    addMajorAchievement(quest, day) {
        // 簡易版: S=6, A=5, B=4, C=3, D=2, E=1.
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

        // ソート: ランク降順、次に日付の降順（新しい順）
        this.records.majorAchievements.sort((a, b) => {
            if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
            return b.day - a.day;
        });

        // トップ10を保持
        if (this.records.majorAchievements.length > 10) {
            this.records.majorAchievements = this.records.majorAchievements.slice(0, 10);
        }
    }

    // 装備レベルアップ（所持金消費）
    upgradeEquipment(cost) {
        if (this.personalMoney >= cost) {
            this.personalMoney -= cost;
            this.equipmentLevel = (this.equipmentLevel || 0) + 1;
            return true;
        }
        return false;
    }

    // 履歴追加メソッド
    addHistory(day, text) {
        this.history.push({ day, text });
    }

    // 名鑑更新
    updateBio(category, context = {}) {
        switch (category) {
            case 'INTRO':
                this.bio.intro = this._generateIntro();
                // ランクB以上ならフレーバーも更新
                if (this.rankValue >= 380) {
                    this.bio.flavor = this._generateFlavor();
                }
                break;
            case 'TRAITS':
                this.bio.traits = this._generateTraitBio();
                break;
            case 'ARTS':
                // context: { artId: '...', artName: '...' }
                if (context.artId) {
                    const text = this._generateArtBio(context.artId, context.artName);
                    // 重複チェック
                    if (!this.bio.arts.includes(text)) {
                        // 2つまで保持 (仕様書: 複数あれば複数表示だが、例にあるように制御してもよい。ここは追記式にする)
                        this.bio.arts.push(text);
                    }
                }
                break;
            case 'CAREER':
                // context: { ...stats } (呼び出し元で集計したデータを渡す想定)
                if (context.careerData) {
                    this.bio.career = this._generateCareerBio(context.careerData);
                }
                break;
            case 'NICKNAME':
                // context: { nickname: '...', feat: '...', day: ... }
                if (context.nickname) {
                    this.bio.nickname = this._generateNicknameBio(context);
                }
                break;
        }
    }

    _getRandomTemplate(templates, context = {}) {
        if (!templates || templates.length === 0) return "";
        let text = templates[Math.floor(Math.random() * templates.length)];
        // 置換
        text = text.replace(/{name}/g, this.name);
        text = text.replace(/{rank}/g, this.rankLabel);
        for (const [key, val] of Object.entries(context)) {
            text = text.replace(new RegExp(`{${key}}`, 'g'), val);
        }
        return text;
    }

    _generateIntro() {
        // rankLabel based lookup
        const typeTemplates = INTRO_TEMPLATES[this.type];
        if (typeTemplates && typeTemplates[this.rankLabel]) {
            return this._getRandomTemplate(typeTemplates[this.rankLabel]);
        }
        // Fallback
        return this._getRandomTemplate(INTRO_TEMPLATES.DEFAULT);
    }

    _generateFlavor() {
        // B Rank+ only, so just look up type
        const list = FLAVOR_TEMPLATES[this.type] || FLAVOR_TEMPLATES.DEFAULT;
        return this._getRandomTemplate(list);
    }

    _generateTraitBio() {
        return this.traits.map(t => {
            const list = TRAIT_TEMPLATES[t] || TRAIT_TEMPLATES.DEFAULT;
            const traitName = TRAITS[t] ? TRAITS[t].name : t;
            return this._getRandomTemplate(list, { traitName: traitName });
        });
    }

    _generateArtBio(artId, artName) {
        // IDに基づく検索、なければデフォルト
        let list = ARTS_TEMPLATES[artId];
        if (!list) list = ARTS_TEMPLATES.DEFAULT;

        return this._getRandomTemplate(list, { artName: artName });
    }

    _generateCareerBio(data) {
        // data: { questCount, topMonster, topQuestType, isStreak, etc }
        // ランダムに1つ選ぶか、複数選ぶか。仕様「ランダムに表示」
        const candidates = [];

        if (data.questCount > 0) {
            candidates.push(this._getRandomTemplate(CAREER_TEMPLATES.QUEST_KEY, { val: data.questCount }));
        }
        if (data.topMonster) {
            candidates.push(this._getRandomTemplate(CAREER_TEMPLATES.TOP_MONSTER, { val: data.topMonster }));
        }
        if (data.topQuestType) {
            const key = `QUEST_TYPE_${data.topQuestType}`;
            if (CAREER_TEMPLATES[key]) {
                candidates.push(this._getRandomTemplate(CAREER_TEMPLATES[key]));
            }
        }

        if (candidates.length === 0) return ["まだ特筆すべき経歴はない。"];

        // 1つランダムに返す、あるいはリストとして返す？
        // 仕様「経歴に関する文をランダムに表示」 -> 1文？
        return [candidates[Math.floor(Math.random() * candidates.length)]];
    }

    _generateNicknameBio(data) {
        if (data.featId && NICKNAME_TEMPLATES[data.featId]) {
            return this._getRandomTemplate(NICKNAME_TEMPLATES[data.featId], data);
        }
        const list = data.feat ? NICKNAME_TEMPLATES.WITH_FEAT : NICKNAME_TEMPLATES.DEFAULT;
        return this._getRandomTemplate(list, data);
    }


    _initRank(origin, joinType, maxRankValue) {
        // 4.1 加入タイプベース
        let min = 0, max = 100;
        if (joinType === JOIN_TYPES.LOCAL) { min = 0; max = 160; }
        else if (joinType === JOIN_TYPES.WANDERER) { min = 0; max = 650; }
        else if (joinType === JOIN_TYPES.CONTRACT) { min = 350; max = 900; }

        let val = Math.floor(Math.random() * (max - min)) + min;

        // 4.2 出身地ボーナス
        if (origin.id === 'central') val += 30;
        else if (origin.id === 'foreign') val -= 40;
        else val += 10;

        // 4.3 クランプ（範囲制限）
        if (val < 0) val = 0;
        // 上限適用
        val = Math.min(val, maxRankValue);
        // 生成時の絶対上限 (オプション)
        if (val > 9999) val = 9999;
        return val;
    }

    _initTrust(origin, joinType) {
        // 5. 初期信頼度
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
        const oldVal = this.rankValue;
        this.rankValue += delta;
        if (this.rankValue < 0) this.rankValue = 0;
        if (this.rankValue > 9999) this.rankValue = 9999;

        // アーツ習得チェック
        // アーツ習得チェック (ランク変動による重複習得を防止)
        if (oldVal < 380 && this.rankValue >= 380 && this.arts.length < 1) this.learnRandomArt();
        if (oldVal < 1000 && this.rankValue >= 1000 && this.arts.length < 2) this.learnRandomArt();

        const oldLabel = this.rankLabel;
        this.rankLabel = this._getRankLabel();

        // Bio更新 (Intro/Flavor): ランク(ラベル)が上がった時のみ更新
        if (oldLabel !== this.rankLabel) {
            this.updateBio('INTRO');
        }
    }

    learnRandomArt() {
        const list = ARTS_DATA[this.type];
        if (!list) return;

        // 既知のアーツを除外
        const knownIds = this.arts.map(a => a.id);
        const candidates = list.filter(a => !knownIds.includes(a.id));

        if (candidates.length > 0) {
            const art = candidates[Math.floor(Math.random() * candidates.length)];
            this.arts.push(art);

            // Bio更新 (Arts)
            this.updateBio('ARTS', { artId: art.id, artName: art.name });
        }
    }

    _generateStats(type, origin, rankValue) {
        const base = BASE_STATS[type];
        const stats = {};

        // 3.1 & 3.2 ランク係数
        const t = rankValue / 1000; // 0..1
        // factor = 0.88 + 0.70 * (t^1.6)
        const rankFactor = 0.88 + 0.70 * Math.pow(t, 1.6);

        // 4.2 ばらつき率 (高ランクほど安定)
        // 0.10 - 0.04 * t -> E: 10%, S: 6%
        const varianceRate = 0.10 - 0.04 * t;

        for (const [key, val0] of Object.entries(base)) {
            // 4.1 ベーススケーリング
            let val = val0 * rankFactor;

            // 4.2 ばらつき処理
            const variance = val * varianceRate * (Math.random() * 2 - 1);
            val += variance;

            // 4.3 出身地補正
            const mod = origin.statMod || {};
            if (mod[key]) val += mod[key];

            // 4.4 遠方出身者の弱体化 (仕様に基づく確率ブースト)
            if (origin.id === 'foreign' && Math.random() < 0.2) {
                val += 3;
            }

            // 4.5 丸め処理
            stats[key] = Math.max(1, Math.round(val));
        }

        // 5. 最低ステータス保証 (保険)
        this._applyMinStatGuard(stats, base, rankFactor);

        return stats;
    }

    _applyMinStatGuard(stats, baseStats, rankFactor) {
        // 5.1 合計値計算
        let sum = 0;
        let baseSum = 0;
        for (const v of Object.values(stats)) sum += v;
        for (const v of Object.values(baseStats)) baseSum += v;

        // 5.2 最低閾値
        // 期待されるランク平均の92%
        const minSum = baseSum * rankFactor * 0.92;

        // 5.3 再分配
        let need = minSum - sum;
        if (need > 0) {
            need = Math.ceil(need);
            // 無限ループ防止用の安全キャップ
            let safety = 20;
            while (need > 0 && safety > 0) {
                // 最も低いステータスを強化
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
