import { Quest } from '../models/Quest.js';
import { CONSTANTS, QUEST_DIFFICULTY, QUEST_TYPES, TYPE_ADVANTAGES, TRAITS, QUEST_RANK_VALUE, GUILD_RANK_THRESHOLDS } from '../data/constants.js';
import { AdventureSimulator } from './AdventureSimulator.js';
import { REGIONS, QUEST_SPECS } from '../data/QuestSpecs.js';
import { ADVENTURE_LOG_DATA } from '../data/AdventureLogData.js';
import { titleService } from './TitleService.js';

export class QuestService {
    constructor() {
        this.questCounter = 100;
        this.simulator = new AdventureSimulator();
    }

    // シミュレーターのデータ初期化
    initSimulator(monsterMd, itemMd) {
        this.simulator.init(monsterMd, itemMd);
    }

    generateDailyQuests(day, reputation = 0, facilities = {}) {
        // 管理部はクエスト数を制御
        const admLv = facilities.administration || 0;
        let count = 2 + admLv;

        // 上限10件
        if (count > 10) count = 10;

        // ギルドランク判定
        const guildRankObj = GUILD_RANK_THRESHOLDS.find(r => reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        const maxRankLabel = guildRankObj.label;

        const quests = [];
        for (let i = 0; i < count; i++) {
            quests.push(this._createRandomQuest(day, maxRankLabel));
        }

        // フェーズ12: 特殊クエスト発生判定
        // 図書室効果: +10% per level
        const libraryLv = facilities.library || 0;
        const specialChance = 0.15 + (libraryLv * 0.10);

        if (Math.random() < specialChance) {
            // 特殊クエストは通常クエストの制限に関わらず追加
            quests.push(this._createSpecialQuest(day));
        }

        return quests;
    }

    // 内部ロジック用カテゴリーマッピング
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

        switch (rank) {
            case 'E': partySize = 1; days = 1; danger = 5; break;
            case 'D': partySize = Math.random() < 0.5 ? 1 : 2; days = Math.floor(Math.random() * 2) + 1; danger = 15; break;
            case 'C': partySize = Math.floor(Math.random() * 2) + 2; days = Math.floor(Math.random() * 2) + 2; danger = 30; break;
            case 'B': partySize = Math.floor(Math.random() * 2) + 3; days = Math.floor(Math.random() * 3) + 3; danger = 50; break;
            case 'A': partySize = Math.floor(Math.random() * 2) + 4; days = Math.floor(Math.random() * 3) + 5; danger = 75; break;
            case 'S': partySize = 5; days = Math.floor(Math.random() * 4) + 7; danger = 95; break;
        }

        const penalty = {
            money: Math.floor(difficulty.baseReward * 0.2),
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

        // 1. Determine Boss Candidate (for Combat/Boss Quests)
        const combatQuestTypes = ['HUNT', 'CULLING', 'DUNGEON', 'RUINS', 'VIP_GUARD', 'REBELLION', 'ESCORT'];
        const npcQuestTypes = ['VIP_GUARD', 'REBELLION', 'ESCORT', 'MERCHANT_DISPUTE', 'ADVENTURER_DISPUTE']; // Types needing Humanoid bosses
        let bossMonster = null;

        // NPC Boss Logic for Human-centric quests (Prioritize Humans over Monsters)
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

    _createSpecialQuest(day) {
        const specialKeys = ['OTHERWORLD', 'ANCIENT_BEAST', 'MISSING_ROYAL', 'ORACLE'];
        const typeKey = specialKeys[Math.floor(Math.random() * specialKeys.length)];
        const spec = QUEST_SPECS[typeKey];
        const logCategory = this._mapTypeToCategory(typeKey);

        this.questCounter++;
        const rank = spec.ranks[Math.floor(Math.random() * spec.ranks.length)];
        const difficulty = QUEST_DIFFICULTY[rank];
        const title = `【特務】${spec.label}`;
        const partySize = rank === 'S' ? 5 : 4;
        const days = 7;

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

        let partyRawScore = 0;
        const weights = quest.weights || {};
        party.forEach(adv => {
            for (const [stat, weight] of Object.entries(weights)) {
                partyRawScore += (adv.stats[stat] || 0) * weight;
            }
        });
        const target = quest.difficulty.powerReq * party.length;
        const delta = partyRawScore - target;
        let successChance = 0.5 + (delta / 200);

        let advantageCount = 0;
        party.forEach(adv => {
            const advantages = TYPE_ADVANTAGES[adv.type] || [];
            if (advantages.includes(quest.type)) advantageCount++;
        });
        successChance += 0.02 * advantageCount;

        if (successChance > 0.95) successChance = 0.95;
        if (successChance < 0.05) successChance = 0.05;

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

        party.forEach(adv => {
            let status = 'OK';
            let injuryMod = 1.0;
            (adv.traits || []).forEach(tKey => {
                const h = TRAITS[tKey]?.hooks;
                if (h && h.injury) injuryMod *= h.injury;
            });

            const effectiveDmg = dmgPerPerson * injuryMod;

            // Death Check
            if (effectiveDmg > 50) {
                let deathChance = 0.05; // 5% chance if massive damage

                // Infirmary Effect: Death Rate -5% * Lv
                // Effectively, Lv 1 Infirmary prevents death from this basic check (0.05 - 0.05 = 0)
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
                reputation: quest.rewards.reputation,
                breakdown: { base: quest.rewards.money, freeHunt: freeHuntReward, materials: materialReward }
            },
            effectiveShareMod: shareMod,
            memberResults: memberResults,
            logs: dailyLogs
        };
    }

    _applyRankUpdate(adv, quest, chance, success, modifiers = {}) {
        const r = success ? 1 : 0;
        const surprise = r - chance;
        adv.perfEMA = (adv.perfEMA || 0) * 0.9 + surprise * 0.1;

        if (!success) {
            // Failure Penalty: Moderate
            adv.updateRank(-5);
            return;
        }

        const qRankVal = QUEST_RANK_VALUE[quest.difficulty.rank] || 1;

        // 1. 基本完了報酬 (緩やかなカーブ)
        // E:6, D:7, C:9, B:12, A:14, S:20
        const baseRewardTable = [0, 6, 7, 9, 12, 14, 20];
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

    generateTournamentQuests(tournamentState, existingQuests) {
        const newQuests = [];

        const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];

        // Solo
        if (tournamentState.solo && tournamentState.solo !== 'COMPLETED') {
            const has = existingQuests.some(q => q.type === 'TOURNAMENT_SOLO' && q.difficulty.rank === tournamentState.solo);
            if (!has) {
                newQuests.push(this._createTournamentQuest('TOURNAMENT_SOLO', tournamentState.solo, 1, ranks.indexOf(tournamentState.solo)));
            }
        }

        // Team
        if (tournamentState.team && tournamentState.team !== 'COMPLETED') {
            const has = existingQuests.some(q => q.type === 'TOURNAMENT_TEAM' && q.difficulty.rank === tournamentState.team);
            if (!has) {
                newQuests.push(this._createTournamentQuest('TOURNAMENT_TEAM', tournamentState.team, 4, ranks.indexOf(tournamentState.team)));
            }
        }
        return newQuests;
    }

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

    _applyStatGrowth(adv, quest, success, modifiers = {}) {
        let base = success ? 0.60 : 0.25;
        if (modifiers.exp) base *= modifiers.exp;

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
