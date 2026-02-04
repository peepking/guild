import { Quest } from '../models/Quest.js';
import { CONSTANTS, QUEST_DIFFICULTY, QUEST_TYPES, TYPE_ADVANTAGES, TRAITS, QUEST_RANK_VALUE, GUILD_RANK_THRESHOLDS, QUEST_CONFIG } from '../data/constants.js';
import { AdventureSimulator } from './AdventureSimulator.js';
import { REGIONS, QUEST_SPECS } from '../data/QuestSpecs.js';
import { ADVENTURE_LOG_DATA } from '../data/AdventureLogData.js';
import { titleService } from './TitleService.js';

/**
 * クエスト（依頼）の生成、判定、結果計算を行うサービス
 */
export class QuestService {
    /**
     * コンストラクタ
     */
    constructor() {
        this.questCounter = 100;
        this.simulator = new AdventureSimulator();
    }

    /**
     * シミュレーターの初期化を行います。
     * @param {object} monsterMd - モンスターデータ
     * @param {object} itemMd - アイテムデータ
     * @returns {void}
     */
    initSimulator(monsterMd, itemMd) {
        this.simulator.init(monsterMd, itemMd);
    }

    /**
     * 日次のクエスト生成を行います。
     * @param {number} day - 現在の日数
     * @param {number} [reputation=0] - ギルド評判
     * @param {object} [facilities={}] - 施設レベル情報
     * @returns {Array<Quest>} 生成されたクエストのリスト
     */
    generateDailyQuests(day, reputation = 0, facilities = {}) {
        // 管理部はクエスト数を制御
        const admLv = facilities.administration || 0;
        let count = QUEST_CONFIG.BASE_COUNT + admLv;

        // 上限10件
        if (count > QUEST_CONFIG.MAX_DAILY) count = QUEST_CONFIG.MAX_DAILY;

        // ギルドランク判定
        const guildRankObj = GUILD_RANK_THRESHOLDS.find(r => reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        const maxRankLabel = guildRankObj.label;

        const quests = [];
        for (let i = 0; i < count; i++) {
            quests.push(this._createRandomQuest(day, maxRankLabel));
        }

        // フェーズ12: 特殊クエスト発生判定
        // 図書室効果: レベルごとに+10%
        const libraryLv = facilities.library || 0;
        const specialChance = QUEST_CONFIG.SPECIAL_CHANCE_BASE + (libraryLv * QUEST_CONFIG.SPECIAL_CHANCE_PER_LIBRARY);

        if (Math.random() < specialChance) {
            // 特殊クエストは通常クエストの制限に関わらず追加
            quests.push(this._createSpecialQuest(day));
        }

        return quests;
    }

    /**
     * タイプキーからログ用カテゴリーへのマッピングを行います。
     * @param {string} typeKey - クエストタイプキー
     * @returns {string} カテゴリー文字列
     * @private
     */
    _mapTypeToCategory(typeKey) {
        // QUEST_SPECSキーに基づくマッピング
        const MAP = {
            'HUNT': 'HUNT', 'CULLING': 'HUNT', 'EXTERMINATION': 'HUNT', 'ANCIENT_BEAST': 'HUNT', 'OTHERWORLD': 'HUNT',
            'MAGIC': 'MAGIC', 'ECOLOGY': 'MAGIC', 'BARRIER': 'MAGIC', 'EXPERIMENT': 'MAGIC', 'ORACLE': 'MAGIC', 'RELIC_ANALYSIS': 'MAGIC',
            'EXPLORE': 'EXPLORE', 'DUNGEON': 'EXPLORE', 'RUINS': 'EXPLORE', 'MATERIAL': 'EXPLORE', 'DOCUMENTS': 'EXPLORE', 'WELL': 'EXPLORE', 'BORDER_RECON': 'EXPLORE',
            'GUARD': 'GUARD', 'ESCORT': 'GUARD', 'TRANSPORT': 'GUARD', 'RESUPPLY': 'GUARD', 'VIP_GUARD': 'GUARD', 'NIGHT_WATCH': 'GUARD', 'RESCUE': 'GUARD', 'FLOOD': 'GUARD', 'FIRE': 'GUARD',
            'MERCHANT_DISPUTE': 'NEGOTIATE', 'ADVENTURER_DISPUTE': 'NEGOTIATE', 'DEBT': 'NEGOTIATE', 'FRAUD': 'NEGOTIATE', 'LOST_CHILD': 'NEGOTIATE', 'REBELLION': 'NEGOTIATE', 'INTEL': 'NEGOTIATE', 'MISSING_ROYAL': 'NEGOTIATE'
        };
        return MAP[typeKey] || 'DEFAULT';
    }

    /**
     * ランダムなクエストを作成します。
     * @param {number} day - 現在の日数
     * @param {string} [maxRankLabel='S'] - 最大ランク制限
     * @returns {Quest} 生成されたクエスト
     * @private
     */
    _createRandomQuest(day, maxRankLabel = 'S') {
        this.questCounter++;
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

        // 最大ランクによるフィルタリング
        const maxVal = QUEST_RANK_VALUE[maxRankLabel] || 1;
        const diffKeys = Object.keys(QUEST_DIFFICULTY).filter(k => {
            const r = QUEST_DIFFICULTY[k].rank;
            return (QUEST_RANK_VALUE[r] || 0) <= maxVal;
        });

        // フォールバック (通常発生しない)
        if (diffKeys.length === 0) diffKeys.push('E');

        const randomDiffKey = diffKeys[Math.floor(Math.random() * diffKeys.length)];
        const difficulty = QUEST_DIFFICULTY[randomDiffKey];
        const rank = difficulty.rank;

        const validKeys = Object.keys(QUEST_SPECS).filter(k => {
            const s = QUEST_SPECS[k];
            return s.category !== 'SPECIAL' && s.ranks && s.ranks.includes(rank);
        });

        let typeKey = 'HUNT';
        if (validKeys.length > 0) {
            typeKey = validKeys[Math.floor(Math.random() * validKeys.length)];
        }

        const spec = QUEST_SPECS[typeKey];
        const logCategory = this._mapTypeToCategory(typeKey);

        const regionLabelMap = { 'EAST': '東街', 'NORTH': '北街', 'SOUTH': '南街', 'WEST': '西街', 'CENTRAL': '中央街' };
        const rLabel = regionLabelMap[region] || '辺境';
        const catMap = { 'ADVENTURE': '冒険', 'LOGISTICS': '物流', 'CITIZEN': '市民', 'POLITICS': '政治', 'ACADEMIC': '学術', 'DISASTER': '災害', 'TROUBLE': '揉め事' };
        const catLabel = catMap[spec.category] || '依頼';
        const title = `[${catLabel}] ${spec.label} (${rLabel}/R${rank})`;

        let partySize = 1;
        let days = 1;
        let danger = 5;

        // まずランク基準のデフォルト値を設定 (danger決定のため必要)
        switch (rank) {
            case 'E': danger = 5; partySize = 1; days = 1; break;
            case 'D': danger = 15; partySize = 2; days = 2; break;
            case 'C': danger = 30; partySize = 3; days = 3; break;
            case 'B': danger = 50; partySize = 4; days = 4; break;
            case 'A': danger = 75; partySize = 5; days = 6; break;
            case 'S': danger = 95; partySize = 5; days = 8; break;
        }

        // スペック定義があれば上書き (優先)
        if (spec.duration) {
            const min = spec.duration.min;
            const max = spec.duration.max;
            days = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        if (spec.partySize) {
            const min = spec.partySize.min;
            const max = spec.partySize.max;
            partySize = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        const penalty = {
            money: Math.floor(difficulty.baseReward * QUEST_CONFIG.PENALTY_RATE),
            reputation: rank === 'S' ? 50 : (rank === 'A' ? 20 : 5)
        };

        const meta = {
            danger01: danger / 100,
            rewardRate01: Math.min(1.0, difficulty.baseReward / 2500),
            prestige01: difficulty.powerReq / 100
        };

        // --- 説明文とターゲット生成 (QUEST_LOGS) ---
        // --- ターゲットとボスの決定 ---
        let target = "正体不明の存在";
        let bossTarget = null; // 実際のボス名を格納
        const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[typeKey];

        // 1. ボス候補の決定 (戦闘/ボスクエスト用)
        const combatQuestTypes = ['HUNT', 'CULLING', 'DUNGEON', 'RUINS', 'VIP_GUARD', 'REBELLION', 'ESCORT'];
        const npcQuestTypes = ['VIP_GUARD', 'REBELLION', 'ESCORT', 'MERCHANT_DISPUTE', 'ADVENTURER_DISPUTE']; // ヒューマノイドボスが必要なタイプ
        let bossMonster = null;

        // 人間中心のクエストのためのNPCボスロジック (モンスターより人間を優先)
        if (npcQuestTypes.includes(typeKey)) {
            const categoryMap = {
                'ESCORT': 'LOGISTICS',
                'VIP_GUARD': 'POLITICS',
                'REBELLION': 'POLITICS',
                'MERCHANT_DISPUTE': 'TROUBLE',
                'ADVENTURER_DISPUTE': 'TROUBLE'
            };
            const cat = categoryMap[typeKey] || 'LOGISTICS';

            // 簡易名前テーブル
            const npcNames = {
                'LOGISTICS': ['野盗の頭目', '賞金首の強盗', '武装盗賊団長', '轟音の山賊王', '伝説の盗賊', '影の支配者'],
                'POLITICS': ['雇われの凶行者', '冷酷な暗殺者', '反乱軍の将軍', '暗殺ギルドの幹部', '隻眼の始末屋', '国崩しの謀略家'],
                'TROUBLE': ['ゴロツキの頭', '悪徳商人の用心棒', '荒くれ者のリーダー', '闇闘技場の王者', '裏社会の始末屋', '伝説の喧嘩師']
            };

            const rankIdx = ['E', 'D', 'C', 'B', 'A', 'S'].indexOf(rank);
            const safeIdx = Math.max(0, Math.min(rankIdx, 5));
            const list = npcNames[cat] || npcNames['LOGISTICS'];
            const baseName = list[safeIdx] || "謎の襲撃者";

            bossMonster = { name: baseName, category: 'ボス (NPC)', rank: rank, isMock: true };
            bossTarget = bossMonster.name;

        } else if (combatQuestTypes.includes(typeKey) && this.simulator.monsters && this.simulator.monsters[region]) {
            const list = this.simulator.monsters[region][rank];
            if (list && list.length > 0) {
                // 優先順位: BOSSカテゴリ > 強敵 > その他
                let candidates = list.filter(m => m.category.includes('ボス'));
                if (candidates.length === 0) candidates = list.filter(m => m.category.includes('強敵'));
                if (candidates.length === 0) candidates = list;

                bossMonster = candidates[Math.floor(Math.random() * candidates.length)];
                bossTarget = bossMonster.name;
            }
        }

        // 2. 表示用ターゲットの決定 (説明文用)
        if (questLogData && questLogData.targets) {
            // 優先1: 特定ターゲットリスト (VIP, 物資など)
            target = questLogData.targets[Math.floor(Math.random() * questLogData.targets.length)];
        } else if (bossTarget && (typeKey === 'HUNT' || typeKey === 'DUNGEON' || typeKey === 'RUINS' || typeKey === 'CULLING' || typeKey === 'REBELLION')) {
            // 優先2: ボスそのものがターゲット
            target = bossTarget;
        } else {
            // 優先3: フォールバック
            if (logCategory === 'GUARD') target = "商隊の荷物";
            else if (logCategory === 'NEGOTIATE') target = "トラブルの元";
            else if (logCategory === 'EXPLORE') {
                // アイテム探索
                if (this.simulator.items && this.simulator.items[region]) {
                    const list = this.simulator.items[region][rank];
                    if (list && list.length > 0) target = list[Math.floor(Math.random() * list.length)].name;
                }
                if (target === "正体不明の存在") target = "未知の素材";
            }
            else if (bossTarget) target = bossTarget; // キャッチオール
            else {
                // ボスが見つからない場合のフォールバック（例：魔法実験など）
                if (this.simulator.monsters && this.simulator.monsters[region]) {
                    const list = this.simulator.monsters[region][rank];
                    if (list && list.length > 0) target = list[Math.floor(Math.random() * list.length)].name;
                }
            }
        }

        let descTemplate = "危険な任務です。";
        if (questLogData && questLogData.descriptions) {
            descTemplate = questLogData.descriptions[Math.floor(Math.random() * questLogData.descriptions.length)];
        }

        const description = descTemplate.replace(/{target}/g, target);

        const q = new Quest(
            `qst_${this.questCounter}`, title, typeKey, difficulty, spec.weights,
            { money: Math.floor(difficulty.baseReward * partySize * days), reputation: Math.floor((difficulty.baseRep || 1) * partySize * days) },
            penalty, partySize, days, danger, meta
        );
        q.createdDay = day;
        q.expiresInDays = Math.floor(Math.random() * 3) + 5;
        q.region = region;
        q.bossTarget = bossTarget; // ボスターゲット割り当て

        q.target = target;
        q.description = description;
        q.logCategory = logCategory;

        return q;
    }

    /**
     * 特殊クエストを生成します。
     * @param {number} day - 現在の日数
     * @returns {Quest} 生成された特殊クエスト
     * @private
     */
    _createSpecialQuest(day) {
        const specialKeys = ['OTHERWORLD', 'ANCIENT_BEAST', 'MISSING_ROYAL', 'ORACLE'];
        const typeKey = specialKeys[Math.floor(Math.random() * specialKeys.length)];
        const spec = QUEST_SPECS[typeKey];
        const logCategory = this._mapTypeToCategory(typeKey);

        this.questCounter++;
        const rank = spec.ranks[Math.floor(Math.random() * spec.ranks.length)];
        const difficulty = QUEST_DIFFICULTY[rank];
        const title = `【特務】${spec.label}`;

        let partySize = rank === 'S' ? 5 : 4;
        let days = 7;

        if (spec.duration) {
            const min = spec.duration.min;
            const max = spec.duration.max;
            days = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        if (spec.partySize) {
            const min = spec.partySize.min;
            const max = spec.partySize.max;
            partySize = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        const q = new Quest(
            `sq_${this.questCounter}`, title, typeKey, difficulty, spec.weights,
            { money: Math.floor(difficulty.baseReward * partySize * days * 2.0), reputation: Math.floor((difficulty.baseRep || 1) * partySize * days * 2.0) },
            { money: Math.floor(difficulty.baseReward * partySize * days), reputation: 20 },
            partySize, days, rank === 'S' ? 95 : 80,
            { danger01: 0.9, rewardRate01: 1.0, prestige01: 1.0 }
        );

        q.isSpecial = true;
        q.manualOnly = true;
        q.createdDay = day;
        q.expiresInDays = 10;
        q.guildShareRule = { baseGuildShare: 0.30, manualPenaltyShift: 0, specialNoShift: true };
        q.region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

        // 特殊ターゲットロジック: このランク/地域のボスモンスター検索
        let target = "脅威";
        let bossTarget = null;
        let foundBoss = false;

        // 'ANCIENT_BEAST' (Monster) or 'OTHERWORLD' (Monster?) の場合、実在モンスターを検索
        if (typeKey === 'ANCIENT_BEAST' || typeKey === 'OTHERWORLD') {
            if (this.simulator.monsters && this.simulator.monsters[q.region]) {
                const list = this.simulator.monsters[q.region][rank];
                if (list && list.length > 0) {
                    // ボスカテゴリを優先
                    const bosses = list.filter(m => m.category && m.category.includes('ボス'));
                    if (bosses.length > 0) {
                        target = bosses[Math.floor(Math.random() * bosses.length)].name;
                        bossTarget = target; // ボスターゲット割り当て
                        foundBoss = true;
                    } else {
                        // ボス不在時 (稀)、どれでも良いので選出
                        target = list[Math.floor(Math.random() * list.length)].name;
                        bossTarget = target; // ボスターゲット割り当て
                        foundBoss = true;
                    }
                }
            }
        }

        // フォールバック: ボスが見つからない場合、またはモンスター討伐系でない場合
        // テキストテンプレートを使用
        if (!foundBoss) {
            const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[typeKey];
            if (questLogData && questLogData.targets) {
                target = questLogData.targets[Math.floor(Math.random() * questLogData.targets.length)];
            }
        }

        q.target = target;
        q.bossTarget = bossTarget;

        let descTemplate = "ギルドへの緊急の特別任務である。詳細は現地にて確認せよ。";
        const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[typeKey];
        if (questLogData && questLogData.descriptions) {
            descTemplate = questLogData.descriptions[Math.floor(Math.random() * questLogData.descriptions.length)];
        }
        q.description = descTemplate.replace(/{target}/g, q.target);

        q.logCategory = logCategory;

        return q;
    }

    /**
     * クエストの成功率を計算します。
     * @param {Quest} quest 
     * @param {Array<Adventurer>} party 
     * @param {object} [modifiers={}] 
     * @returns {number} 0.0 - 1.0
     */
    calculateSuccessChance(quest, party, modifiers = {}) {
        let partyRawScore = 0;
        const weights = quest.weights || {};
        party.forEach(adv => {
            for (const [stat, weight] of Object.entries(weights)) {
                partyRawScore += (adv.stats[stat] || 0) * weight;
            }
        });
        const target = quest.difficulty.powerReq * party.length;
        const delta = partyRawScore - target;
        let successChance = QUEST_CONFIG.SUCCESS_BASE + (delta / QUEST_CONFIG.SUCCESS_DIVISOR);

        let advantageCount = 0;
        party.forEach(adv => {
            const advantages = TYPE_ADVANTAGES[adv.type] || [];
            if (advantages.includes(quest.type)) advantageCount++;
        });
        successChance += 0.02 * advantageCount;

        // 顧問補正 (成功率)
        if (modifiers.success) {
            successChance += modifiers.success;
        }

        if (successChance > QUEST_CONFIG.SUCCESS_CAP_MAX) successChance = QUEST_CONFIG.SUCCESS_CAP_MAX;
        if (successChance < QUEST_CONFIG.SUCCESS_CAP_MIN) successChance = QUEST_CONFIG.SUCCESS_CAP_MIN;

        return successChance;
    }

    /**
     * クエストに対する冒険者の適合スコアを計算します。
     * @param {Quest} quest - 対象クエスト
     * @param {Adventurer} adventurer - 対象冒険者
     * @returns {number} スコア
     */
    calculateScore(quest, adventurer) {
        // ... (unchanged)
        let baseScore = 0;
        const weights = quest.weights || {};
        for (const [stat, weight] of Object.entries(weights)) {
            if (weight > 0) baseScore += (adventurer.stats[stat] || 0) * weight;
        }

        const danger = Math.min(1.0, quest.difficulty.powerReq / 100);
        const rewardRate = Math.min(1.0, quest.rewards.money / 1000);
        const prestige = 0.5;

        const temp = adventurer.temperament;
        const riskBonus = temp.risk * danger * 0.25;
        const greedBonus = temp.greed * rewardRate * 0.3;
        const socialBonus = temp.social * prestige * 0.2;

        let traitBonus = 0;
        adventurer.traits.forEach(tKey => {
            const t = TRAITS[tKey];
            if (t && t.autoPick) {
                if (t.autoPick.danger) traitBonus += t.autoPick.danger * danger;
                if (t.autoPick.reward) traitBonus += t.autoPick.reward * rewardRate;
                if (t.autoPick.prestige) traitBonus += t.autoPick.prestige * prestige;
            }
        });

        const multiplier = 1 + riskBonus + greedBonus + socialBonus + traitBonus;
        return baseScore * multiplier;
    }

    /**
     * クエストの実行シミュレーション（全体）を行います。
     * @param {Quest} quest - クエスト
     * @param {Array<Adventurer>} party - パーティメンバー
     * @param {object} [modifiers={}] - 補正情報
     * @returns {object} 結果オブジェクト
     */
    attemptQuest(quest, party, modifiers = {}) {
        const totalDays = quest.days || 1;
        const dailyLogs = [];
        const combinedResults = {
            battles: 0, wins: 0, damageTaken: 0, itemsFound: [], monstersKilled: []
        };

        for (let d = 1; d <= totalDays; d++) {
            const SimResult = this.simulator.simulateDay(quest, party, d, totalDays, modifiers);
            dailyLogs.push({ day: d, logs: SimResult.logs });
            combinedResults.battles += SimResult.results.battles;
            combinedResults.wins += SimResult.results.wins;
            combinedResults.damageTaken += SimResult.results.damageTaken;
            combinedResults.itemsFound.push(...SimResult.results.itemsFound);
            combinedResults.monstersKilled.push(...SimResult.results.monstersKilled);
        }

        const successChance = this.calculateSuccessChance(quest, party, modifiers);

        const roll = Math.random();
        let mainObjectiveSuccess = roll < successChance;

        // ロジック: 成功判定のためのボス討伐確認
        const spec = QUEST_SPECS[quest.type];
        const hasMandatoryBoss = (spec && spec.bossDays && spec.bossDays.length > 0) || !!quest.bossTarget;

        const bossDefeated = combinedResults.monstersKilled.some(m =>
            m.isBoss || (quest.bossTarget && m.name === quest.bossTarget) || (quest.target && m.name.includes(quest.target))
        );

        if (bossDefeated) {
            mainObjectiveSuccess = true;
        } else if (hasMandatoryBoss) {
            // ボス必須で未討伐の場合、強制失敗
            mainObjectiveSuccess = false;
        }

        const memberResults = [];
        const dmgPerPerson = Math.floor(combinedResults.damageTaken / party.length);
        let penaltyMod = 1.0;
        let shareMod = 1.0;

        party.forEach(p => {
            (p.traits || []).forEach(tKey => {
                const h = TRAITS[tKey]?.hooks;
                if (h) {
                    if (h.penalty) penaltyMod *= h.penalty;
                    if (h.guildShare) shareMod *= h.guildShare;
                }
            });
        });

        if (modifiers.penalty) {
            penaltyMod *= modifiers.penalty;
        }

        party.forEach(adv => {
            let status = 'OK';
            let injuryMod = 1.0;
            (adv.traits || []).forEach(tKey => {
                const h = TRAITS[tKey]?.hooks;
                if (h && h.injury) injuryMod *= h.injury;
            });

            const effectiveDmg = dmgPerPerson * injuryMod;

            // 死亡判定
            if (effectiveDmg > 50) {
                let deathChance = 0.05; // 大ダメージの場合5%の確率

                // 医務室効果: 死亡率 -5% * レベル
                // 実質的に、レベル1の医務室でこの基本チェックによる死亡を防ぐ (0.05 - 0.05 = 0)
                const infirmaryLv = (modifiers.facilities && modifiers.facilities.infirmary) || 0;
                if (infirmaryLv > 0) {
                    deathChance = Math.max(0, deathChance - (0.05 * infirmaryLv));
                }

                if (Math.random() < deathChance) {
                    status = 'DEAD';
                }
            }

            if (status !== 'DEAD' && effectiveDmg > 20 && Math.random() < 0.5) status = 'INJURED';

            memberResults.push({ adventurer: adv, status: status });
            this._applyRankUpdate(adv, quest, successChance, mainObjectiveSuccess, modifiers);
            this._applyStatGrowth(adv, quest, mainObjectiveSuccess, modifiers);

            // フェーズ5: レコード更新と称号チェック
            if (mainObjectiveSuccess) {
                // クエスト回数更新
                adv.records.quests[quest.type] = (adv.records.quests[quest.type] || 0) + 1;

                // 主要功績更新
                adv.addMajorAchievement(quest, quest.createdDay + totalDays);

                // 討伐数更新 (パーティ全員で共有)
                combinedResults.monstersKilled.forEach(m => {
                    if (m.isBoss) {
                        adv.records.bossKills.push(m.id || m.name); // ID優先
                    }
                    // タイプまたは名前で集計
                    const type = m.name; // 簡易化
                    adv.records.kills[type] = (adv.records.kills[type] || 0) + 1;

                    // 主要討伐更新
                    adv.addMajorKill(m, quest.createdDay + totalDays);
                });

                // 称号資格: Sランク成功回数
                if (quest.difficulty.rank === 'S') {
                    adv.sRankSuccessCount = (adv.sRankSuccessCount || 0) + 1;
                }

                // 称号チェック
                if (titleService) {
                    // ボス討伐判定
                    const bossKill = combinedResults.monstersKilled.find(m => m.isBoss);
                    // bossKill.id または bossKill.name を使用。なければ quest.bossTarget
                    const bossId = bossKill ? (bossKill.id || bossKill.name) : quest.bossTarget;

                    const context = {
                        questType: quest.type,
                        rank: quest.difficulty.rank,
                        result: 'SUCCESS',
                        isBoss: !!bossId, // IDがあればボスコンテキストとして扱う
                        bossId: bossId,
                        questId: quest.id,
                        region: quest.region,
                        day: quest.createdDay + totalDays
                    };

                    const newTitle = titleService.tryGenerateTitle(adv, context);
                    if (newTitle) {
                        adv.addHistory(quest.createdDay + totalDays, `二つ名「${newTitle}」を習得`);
                        // ローカル表示用にメンバー結果に追加
                        memberResults[memberResults.length - 1].newTitle = newTitle;
                    }
                }
            }
        });

        let freeHuntReward = 0;
        if (!quest.isTournament) {
            combinedResults.monstersKilled.forEach(m => {
                freeHuntReward += 10;
                if (m.isBoss) freeHuntReward += 100;
            });
        }
        let materialReward = 0;
        combinedResults.itemsFound.forEach(i => {
            materialReward += (i.value || 20);
        });

        // 倉庫効果: 売却額+10%
        // (倉庫が存在する場合)
        if (modifiers.facilities && modifiers.facilities.warehouse > 0) {
            materialReward = Math.floor(materialReward * 1.1);
        }

        const marketMod = modifiers.market || 1.0;
        materialReward = Math.floor(materialReward * marketMod);

        let money = quest.rewards.money + freeHuntReward + materialReward;
        if (modifiers.reward) {
            money = Math.floor(money * modifiers.reward);
        }

        // --- 5. 探索ログのエピローグ (ナラティブブリッジ) ---
        const lastDayLog = dailyLogs[dailyLogs.length - 1];
        if (lastDayLog) {
            const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[quest.type];
            let bridgeTemplates = [];

            if (questLogData) {
                bridgeTemplates = mainObjectiveSuccess ? questLogData.end_success : questLogData.end_failure;
            }

            // 安全策としてのフォールバック
            if (!bridgeTemplates || bridgeTemplates.length === 0) {
                bridgeTemplates = ["任務完了。帰還する。"];
            }

            const bridgeText = bridgeTemplates[Math.floor(Math.random() * bridgeTemplates.length)];
            const formattedBridge = bridgeText.replace(/{area}/g, this.simulator._getRegionName(quest.region) || "現地")
                .replace(/{target}/g, quest.target || "ターゲット");

            // --- クライマックスログは Simulator に移動済み ---

            lastDayLog.logs.push(`[状況] ${formattedBridge}`);

            const outroTemplates = mainObjectiveSuccess ? ADVENTURE_LOG_DATA.OUTRO.SUCCESS : ADVENTURE_LOG_DATA.OUTRO.FAILURE;
            const outro = outroTemplates[Math.floor(Math.random() * outroTemplates.length)];
            lastDayLog.logs.push(`[結末] ${outro}`);
        }

        return {
            success: mainObjectiveSuccess,
            party: party,
            quest: quest,
            effectivePenalty: {
                money: Math.floor((quest.penalty?.money || 0) * penaltyMod),
                reputation: quest.penalty?.reputation || 0
            },
            reward: {
                money: Math.floor(money),
                reputation: Math.floor(quest.rewards.reputation * (modifiers.fame || 1.0)),
                breakdown: { base: quest.rewards.money, freeHunt: freeHuntReward, materials: materialReward }
            },
            effectiveShareMod: shareMod,
            memberResults: memberResults,
            logs: dailyLogs
        };
    }

    /**
     * 冒険者のランク評価を更新します。
     * @param {Adventurer} adv - 更新対象の冒険者
     * @param {Quest} quest - 実行したクエスト
     * @param {number} chance - 推定成功率
     * @param {boolean} success - 実際の成否
     * @param {object} [modifiers={}] - 補正
     * @private
     */
    _applyRankUpdate(adv, quest, chance, success, modifiers = {}) {
        const r = success ? 1 : 0;
        const surprise = r - chance;
        adv.perfEMA = (adv.perfEMA || 0) * 0.9 + surprise * 0.1;

        if (!success) {
            // 失敗ペナルティ: 中程度
            adv.updateRank(-5);
            return;
        }

        const qRankVal = QUEST_RANK_VALUE[quest.difficulty.rank] || 1;

        // 1. 基本完了報酬 (緩やかなカーブ)
        // E:6, D:7, C:9, B:12, A:14, S:20
        const baseRewardTable = QUEST_CONFIG.RANK_REWARD_TABLE;
        const baseReward = baseRewardTable[qRankVal] || 6;

        // 2. 下克上ボーナス & ギャップペナルティ
        // 冒険者のランク値を閾値に基づき 0-5 に変換
        let advRankVal = 0;
        if (adv.rankValue >= 1000) advRankVal = 5; // S
        else if (adv.rankValue >= 640) advRankVal = 4; // A
        else if (adv.rankValue >= 380) advRankVal = 3; // B
        else if (adv.rankValue >= 200) advRankVal = 2; // C
        else if (adv.rankValue >= 80) advRankVal = 1; // D
        else advRankVal = 0; // E

        let underdogBonus = 0;
        let gapPenaltyRate = 1.0;

        const diff = qRankVal - advRankVal;

        if (diff > 0) {
            // 格上挑戦: ランク差ごとに +20%
            underdogBonus = baseReward * (diff * 0.2);
        } else if (diff < 0) {
            // 格下周回: ランク差ごとに -40%
            gapPenaltyRate = Math.max(0, 1.0 + (diff * 0.4));
        }

        // 3. サプライズボーナス (低確率勝利へのボーナス)
        const surpriseFactor = Math.max(0, 1.0 - chance);
        const surpriseBonus = baseReward * surpriseFactor * 0.5;

        // 合計変動値
        let delta = (baseReward + underdogBonus + surpriseBonus) * gapPenaltyRate;

        // 4. 収穫逓減 (超高ランク帯のみ: 850+)
        if (adv.rankValue > 850) {
            const ratio = Math.max(0, (1050 - adv.rankValue) / 150);
            delta *= ratio;
        }

        // 訓練所効果: ランクC以下への成長ボーナス
        // Cランク未満 (<380) に対して適用
        if (adv.rankValue < 380) { // Rank C or lower
            const trainLv = (modifiers.facilities && modifiers.facilities.training) || 0;
            if (trainLv > 0) {
                delta *= (1 + (0.1 * trainLv));
            }
        }

        adv.updateRank(delta);
    }

    /**
     * トーナメントクエストを生成します。
     * @param {object} tournamentState - トーナメント状態
     * @param {Array<Quest>} existingQuests - 既存のクエストリスト
     * @returns {Array<Quest>} 新規トーナメントクエスト
     */
    generateTournamentQuests(tournamentState, existingQuests) {
        const newQuests = [];

        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];

        // 個人戦
        if (tournamentState.solo && tournamentState.solo !== 'COMPLETED') {
            const has = existingQuests.some(q => q.type === 'TOURNAMENT_SOLO' && q.difficulty.rank === tournamentState.solo);
            if (!has) {
                newQuests.push(this._createTournamentQuest('TOURNAMENT_SOLO', tournamentState.solo, 1, ranks.indexOf(tournamentState.solo)));
            }
        }

        // 団体戦
        if (tournamentState.team && tournamentState.team !== 'COMPLETED') {
            const has = existingQuests.some(q => q.type === 'TOURNAMENT_TEAM' && q.difficulty.rank === tournamentState.team);
            if (!has) {
                newQuests.push(this._createTournamentQuest('TOURNAMENT_TEAM', tournamentState.team, 4, ranks.indexOf(tournamentState.team)));
            }
        }
        return newQuests;
    }

    /**
     * 個別のトーナメントクエストインスタンスを生成します。
     * @param {string} type - タイプ
     * @param {string} rank - ランク
     * @param {number} partySize - パーティサイズ
     * @param {number} rankIdx - ランクインデックス
     * @returns {Quest} トーナメントクエスト
     * @private
     */
    _createTournamentQuest(type, rank, partySize, rankIdx) {
        this.questCounter++;
        const difficulty = QUEST_DIFFICULTY[rank];
        const days = 4;

        let title = type === 'TOURNAMENT_SOLO' ? `天下一武闘会（個人・${rank}）` : `天下一武闘会（団体・${rank}）`;

        let rewardMoney = 1000 * (rankIdx + 1);
        if (partySize === 4) rewardMoney *= 2;

        // 名声: 標準 = 基礎名声 * 人数 * 日数
        const rewardRep = Math.floor((difficulty.baseRep || 1) * partySize * days);

        const q = new Quest(
            `tourney_${this.questCounter}`, title, type, difficulty, {},
            { money: rewardMoney, reputation: rewardRep },
            { money: 0, reputation: 0 }, // ペナルティなし
            partySize, days, 100, // 危険度 100%
            {}
        );
        q.entryFee = 0;
        q.expiresInDays = null; // 無期限
        q.isTournament = true;
        q.isSpecial = true;

        if (ADVENTURE_LOG_DATA.QUEST_LOGS[type] && ADVENTURE_LOG_DATA.QUEST_LOGS[type].descriptions) {
            q.description = ADVENTURE_LOG_DATA.QUEST_LOGS[type].descriptions[0];
        }

        return q;
    }

    /**
     * 魔王軍侵攻クエストを生成します（単発・フェーズ・レイド含む）
     * @param {number} day - 現在の日付
     * @param {object} invasionState - 侵攻状態
     * @param {number} reputation - ギルド評判
     * @param {Array<Quest>} existingQuests - 既存クエスト
     * @returns {Array<Quest>} 生成されたクエストリスト
     */
    generateDemonInvasionQuests(day, invasionState, reputation, existingQuests) {
        const quests = [];
        if (!invasionState) return quests;

        // ランクチェック
        const guildRankObj = GUILD_RANK_THRESHOLDS.find(r => reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        const rankLabel = guildRankObj.label;
        const rankVal = QUEST_RANK_VALUE[rankLabel] || 0;

        // Helper
        const hasQuest = (type) => existingQuests.some(q => q.type === type);

        // 1. Single Occurrence (Rank C+: 200)
        // 確率で発生 (20%)
        if (rankVal >= QUEST_RANK_VALUE['C']) {
            if (Math.random() < 0.2) {
                const types = ['CULT_PURGE', 'SMALL_RAID', 'KIDNAP_INVESTIGATION', 'MARCH_RECON'];
                const type = types[Math.floor(Math.random() * types.length)];
                if (!hasQuest(type)) {
                    quests.push(this._createDemonQuest(day, type));
                }
            }
        }

        // 2. Phased Quests (Rank B+: 380)
        if (rankVal >= QUEST_RANK_VALUE['B']) {
            // Offense
            let offType = null;
            if (invasionState.offensePhase === 1) offType = 'OFFENSE_BREAKTHROUGH';
            else if (invasionState.offensePhase === 2) offType = 'OFFENSE_CAMP_RAID';
            else if (invasionState.offensePhase === 3) offType = 'OFFENSE_GENERAL_HUNT';

            // フェーズ進行中は常に掲示（または高確率）
            // ここでは常時掲示とするが、クリア済みではないかチェックが必要（GameLoopでクリア時にフェーズが進むので、既存リストになければ出して良い）
            if (offType && !hasQuest(offType)) {
                quests.push(this._createDemonQuest(day, offType, true));
            }

            // Defense
            let defType = null;
            if (invasionState.defensePhase === 1) defType = 'DEFENSE_FRONTLINE';
            else if (invasionState.defensePhase === 2) defType = 'DEFENSE_SUPPLY';
            else if (invasionState.defensePhase === 3) defType = 'DEFENSE_FORT';

            if (defType && !hasQuest(defType)) {
                quests.push(this._createDemonQuest(day, defType, true));
            }
        }

        // 3. Raid (Rank A+: 640)
        if (rankVal >= QUEST_RANK_VALUE['A'] && invasionState.raidAvailable) {
            const raidType = 'RAID_GENERAL_SUBJUGATION';
            if (!hasQuest(raidType)) {
                quests.push(this._createDemonQuest(day, raidType, true, true));
            }
        }

        return quests;
    }




    /**
     * レイド（決戦）クエストのタイトルをフォーマットします。
     * @param {string} title - 元のタイトル
     * @returns {string} フォーマットされたタイトル
     * @private
     */
    _formatRaidTitle(title) {
        return `【決戦】${title}`;
    }

    /**
     * 魔王軍クエストのタイトルをフォーマットします。
     * @param {string} title - 元のタイトル
     * @returns {string} フォーマットされたタイトル
     * @private
     */
    _formatDemonArmyTitle(title) {
        return `【魔王軍】${title}`;
    }

    /**
     * 魔王軍クエストのインスタンスを生成します。
     * @param {number} day - 現在の日付
     * @param {string} typeKey - クエストタイプ
     * @param {boolean} isDemonArmy - 魔王軍（重要）フラグ
     * @param {boolean} isRaid - レイドフラグ
     * @returns {Quest} クエスト
     * @private
     */
    _createDemonQuest(day, typeKey, isDemonArmy = false, isRaid = false) {
        this.questCounter++;
        const spec = QUEST_SPECS[typeKey];
        if (!spec) return null;

        const rank = spec.ranks[spec.ranks.length - 1]; // 最高ランクを採用、または推奨ランク?
        // 仕様書では C+, B+, A+ とあるので、推奨ランクを使用すべきだが、QUEST_SPECS.ranks配列の最初をとるか...
        // QUEST_SPECS定義済みランクからランダム、あるいは固定。
        // フェーズ系は固定ランクの方が良い。
        // ここでは定義されているランクの中から選ぶ（既存ロジック準拠）
        const selectedRank = spec.ranks[Math.floor(Math.random() * spec.ranks.length)];
        const difficulty = QUEST_DIFFICULTY[selectedRank];

        // タイトル生成
        let title = spec.label;
        if (isRaid) {
            title = this._formatRaidTitle(title);
        }
        if (isDemonArmy) {
            title = this._formatDemonArmyTitle(title);
        }

        // 報酬計算
        let partySize = spec.partySize.max; // 推奨人数
        let days = spec.duration.max;

        // ランダム性を持たせる場合
        if (spec.partySize) {
            const min = spec.partySize.min;
            const max = spec.partySize.max;
            partySize = Math.floor(Math.random() * (max - min + 1)) + min;
        }
        if (spec.duration) {
            const min = spec.duration.min;
            const max = spec.duration.max;
            days = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        const q = new Quest(
            `demon_${this.questCounter}`, title, typeKey, difficulty, spec.weights,
            { money: Math.floor(difficulty.baseReward * partySize * days * 1.5), reputation: Math.floor((difficulty.baseRep || 1) * partySize * days * 1.5) },
            { money: Math.floor(difficulty.baseReward * partySize * days), reputation: 50 },
            partySize, days, 90,
            { danger01: 0.8, rewardRate01: 1.2, prestige01: 1.2 }
        );

        q.createdDay = day;
        q.expiresInDays = isDemonArmy ? 10 : 5;
        if (isRaid) q.expiresInDays = 3;

        q.isSpecial = true;
        q.manualOnly = true;
        q.region = 'CENTRAL'; // 魔王軍はどこから？ とりあえず中央か、ランダム
        // regionをランダムに
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
        q.region = region;

        // ターゲット設定
        let target = "魔王軍";
        let bossTarget = null;

        const logData = ADVENTURE_LOG_DATA.QUEST_LOGS[typeKey];
        if (logData && logData.targets) {
            target = logData.targets[Math.floor(Math.random() * logData.targets.length)];
        }

        // ボス設定
        // OFFENSE_GENERAL_HUNT, DEFENSE_FORT -> Demon King General
        // RAID_GENERAL_SUBJUGATION -> Demon King Lieutenant
        if (typeKey === 'OFFENSE_GENERAL_HUNT' || typeKey === 'DEFENSE_FORT') {
            bossTarget = "魔王軍将軍";
        } else if (typeKey === 'RAID_GENERAL_SUBJUGATION') {
            bossTarget = "魔王軍幹部";
            // レイド補正
            q.raidBoss = true;
        } else if (spec.bossDays && spec.bossDays.includes('LAST')) {
            // CULT_PURGE, SMALL_RAID etc.
            // 既存のボス生成ロジックを流用するか、簡易生成
            // ここでは簡易名前
            const bosses = ["魔王軍小隊長", "邪教の司祭", "魔族の戦士長"];
            bossTarget = bosses[Math.floor(Math.random() * bosses.length)];
        }

        q.target = target;
        q.bossTarget = bossTarget;

        let descTemplate = "魔王軍の脅威が迫っている。";
        if (logData && logData.descriptions) {
            descTemplate = logData.descriptions[Math.floor(Math.random() * logData.descriptions.length)];
        }
        q.description = descTemplate.replace(/{target}/g, target).replace(/{boss}/g, bossTarget || "敵");

        q.logCategory = 'SPECIAL'; // or customized

        return q;
    }

    /**
     * ステータス成長を適用します。
     * @param {Adventurer} adv - 対象冒険者
     * @param {Quest} quest - 実行クエスト
     * @param {boolean} success - 成功可否
     * @param {object} modifiers - 補正
     * @private
     */
    _applyStatGrowth(adv, quest, success, modifiers = {}) {
        let base = success ? QUEST_CONFIG.GROWTH_BASE_SUCCESS : QUEST_CONFIG.GROWTH_BASE_FAILURE;
        if (modifiers.exp) base *= modifiers.exp;
        if (modifiers.growth) base *= modifiers.growth; // 顧問の成長補正

        // 訓練所効果: ランクC以下のステータス成長 +10% * Lv
        if (adv.rankValue < 380) {
            const trainLv = (modifiers.facilities && modifiers.facilities.training) || 0;
            if (trainLv > 0) {
                base *= (1 + (0.1 * trainLv));
            }
        }
        const qRank = QUEST_RANK_VALUE[quest.difficulty.rank] || 1;
        const diff = 0.7 + qRank * 0.15;
        const weights = quest.weights || {};
        for (const [stat, weight] of Object.entries(weights)) {
            if (weight > 0) {
                const current = adv.stats[stat] || 10;
                const diminish = Math.max(0.1, (120 - current) / 100);
                const gain = base * diff * weight * diminish;
                if (gain > 0) adv.stats[stat] += gain;
            }
        }
    }
}
