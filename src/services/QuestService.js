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

    // Method to init simulator with data
    initSimulator(monsterMd, itemMd) {
        this.simulator.init(monsterMd, itemMd);
    }

    generateDailyQuests(day, reputation = 0, facilities = {}) {
        // Administration Level controls Count
        const admLv = facilities.administration || 0;
        let count = 2 + admLv;

        // Cap safety? Maybe 10.
        if (count > 10) count = 10;

        // Determine Guild Rank
        const guildRankObj = GUILD_RANK_THRESHOLDS.find(r => reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        const maxRankLabel = guildRankObj.label;

        const quests = [];
        for (let i = 0; i < count; i++) {
            quests.push(this._createRandomQuest(day, maxRankLabel));
        }

        // Phase 12: Special Quest Chance
        // Library Effect: +10% per level
        const libraryLv = facilities.library || 0;
        const specialChance = 0.15 + (libraryLv * 0.10);

        if (Math.random() < specialChance) {
            // Special quests also need rank cap? Usually special = hard.
            // Let's pass maxRankLabel to special too if needed, or allow special to exceed?
            // "Guild Rank limits displayed quests". Special implies it appears. 
            // I'll leave special as is for now, or clamp it inside.
            quests.push(this._createSpecialQuest(day));
        }

        return quests;
    }

    // Still useful for internal logic or broad categorization if needed
    _mapTypeToCategory(typeKey) {
        // Mappings based on QUEST_SPECS keys
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

        // Filter by Max Rank
        const maxVal = QUEST_RANK_VALUE[maxRankLabel] || 1;
        const diffKeys = Object.keys(QUEST_DIFFICULTY).filter(k => {
            const r = QUEST_DIFFICULTY[k].rank;
            return (QUEST_RANK_VALUE[r] || 0) <= maxVal;
        });

        // Fallback if empty (shouldn't happen)
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

        // --- DESCRIPTION & TARGET GENERATION (QUEST_LOGS) ---
        // --- TARGET & BOSS DETERMINATION ---
        let target = "正体不明の存在";
        let bossTarget = null; // New property for actual boss name
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

            // Simple Name Tables
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
                // Prioritize BOSS category > Strong > Others
                let candidates = list.filter(m => m.category.includes('ボス'));
                if (candidates.length === 0) candidates = list.filter(m => m.category.includes('強敵'));
                if (candidates.length === 0) candidates = list;

                bossMonster = candidates[Math.floor(Math.random() * candidates.length)];
                bossTarget = bossMonster.name;
            }
        }

        // 2. Determine Display Target (Description)
        if (questLogData && questLogData.targets) {
            // Priority 1: Specific Target List (e.g. VIP, Goods)
            target = questLogData.targets[Math.floor(Math.random() * questLogData.targets.length)];
        } else if (bossTarget && (typeKey === 'HUNT' || typeKey === 'DUNGEON' || typeKey === 'RUINS' || typeKey === 'CULLING' || typeKey === 'REBELLION')) {
            // Priority 2: The Boss IS the Target
            target = bossTarget;
        } else {
            // Priority 3: Fallbacks
            if (logCategory === 'GUARD') target = "商隊の荷物";
            else if (logCategory === 'NEGOTIATE') target = "トラブルの元";
            else if (logCategory === 'EXPLORE') {
                // Item search
                if (this.simulator.items && this.simulator.items[region]) {
                    const list = this.simulator.items[region][rank];
                    if (list && list.length > 0) target = list[Math.floor(Math.random() * list.length)].name;
                }
                if (target === "正体不明の存在") target = "未知の素材";
            }
            else if (bossTarget) target = bossTarget; // Catch-all
            else {
                // Random monster fallback if no boss found (e.g. MAGIC?)
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
        q.bossTarget = bossTarget; // Assign bossTarget

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

        // Special Target Logic: Try to find a BOSS monster for this rank/region
        let target = "脅威";
        let bossTarget = null;
        let foundBoss = false;

        // For 'ANCIENT_BEAST' (Monster) or 'OTHERWORLD' (Monster?), try to find a real monster
        if (typeKey === 'ANCIENT_BEAST' || typeKey === 'OTHERWORLD') {
            if (this.simulator.monsters && this.simulator.monsters[q.region]) {
                const list = this.simulator.monsters[q.region][rank];
                if (list && list.length > 0) {
                    // Prefer Boss category
                    const bosses = list.filter(m => m.category.includes('ボス'));
                    if (bosses.length > 0) {
                        target = bosses[Math.floor(Math.random() * bosses.length)].name;
                        bossTarget = target; // Assign to bossTarget
                        foundBoss = true;
                    } else {
                        // If no boss found (rare), pick any
                        target = list[Math.floor(Math.random() * list.length)].name;
                        bossTarget = target; // Assign to bossTarget
                        foundBoss = true;
                    }
                }
            }
        }

        // Fallback to text templates if no boss found (or if type is NOT monster-fighting like ORACLE/MISSING_ROYAL)
        // OR if foundBoss is false
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

        // Logic: Verify Boss Defeat for Success
        const spec = QUEST_SPECS[quest.type];
        const hasMandatoryBoss = (spec && spec.bossDays && spec.bossDays.length > 0) || !!quest.bossTarget;

        const bossDefeated = combinedResults.monstersKilled.some(m =>
            m.isBoss || (quest.bossTarget && m.name === quest.bossTarget) || (quest.target && m.name.includes(quest.target))
        );

        if (bossDefeated) {
            mainObjectiveSuccess = true;
        } else if (hasMandatoryBoss) {
            // If a boss was required but not defeated (e.g. Escaped), Force Failure
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

            // Phase 5: Update Records & Check Titles
            if (mainObjectiveSuccess) {
                // Update Quest Counts
                adv.records.quests[quest.type] = (adv.records.quests[quest.type] || 0) + 1;

                // Update Major Achievements
                adv.addMajorAchievement(quest, quest.createdDay + totalDays);

                // Update Kill Counts (Shared credit for everyone in party)
                combinedResults.monstersKilled.forEach(m => {
                    if (m.isBoss) {
                        adv.records.bossKills.push(m.id || m.name); // Prefer ID
                    }
                    // Extract general type or use name
                    const type = m.name; // Simplification
                    adv.records.kills[type] = (adv.records.kills[type] || 0) + 1;

                    // Update Major Kills
                    adv.addMajorKill(m, quest.createdDay + totalDays);
                });

                // S-Rank Success Counter for Title Eligibility
                if (quest.difficulty.rank === 'S') {
                    adv.sRankSuccessCount = (adv.sRankSuccessCount || 0) + 1;
                }

                // Title Check
                if (titleService) {
                    // Determine if any boss was killed
                    const bossKill = combinedResults.monstersKilled.find(m => m.isBoss);
                    // Use bossKill.id or bossKill.name. Fallback to quest.bossTarget if logic requires it.
                    const bossId = bossKill ? (bossKill.id || bossKill.name) : quest.bossTarget;

                    const context = {
                        questType: quest.type,
                        rank: quest.difficulty.rank,
                        result: 'SUCCESS',
                        isBoss: !!bossId, // Treat as boss context if we have a bossId from kill or target
                        bossId: bossId,
                        questId: quest.id,
                        region: quest.region,
                        day: quest.createdDay + totalDays
                    };

                    const newTitle = titleService.tryGenerateTitle(adv, context);
                    if (newTitle) {
                        adv.addHistory(quest.createdDay + totalDays, `二つ名「${newTitle}」を習得`);
                        // Log locally to day log? Or return in result?
                        // Let's add to member result so UI can show it
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

        // Warehouse Effect: +10% Sell Value if exists
        // (Assuming Warehouse is a single level binary or check Level>0)
        if (modifiers.facilities && modifiers.facilities.warehouse > 0) {
            materialReward = Math.floor(materialReward * 1.1);
        }

        let money = quest.rewards.money + freeHuntReward + materialReward;
        if (modifiers.reward) {
            money = Math.floor(money * modifiers.reward);
        }

        // --- 5. Add OUTRO Log with Narrative Bridge (QUEST_LOGS) ---
        const lastDayLog = dailyLogs[dailyLogs.length - 1];
        if (lastDayLog) {
            const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[quest.type];
            let bridgeTemplates = [];

            if (questLogData) {
                bridgeTemplates = mainObjectiveSuccess ? questLogData.end_success : questLogData.end_failure;
            }

            // Fallback for safety (though all covered)
            if (!bridgeTemplates || bridgeTemplates.length === 0) {
                bridgeTemplates = ["任務完了。帰還する。"];
            }

            const bridgeText = bridgeTemplates[Math.floor(Math.random() * bridgeTemplates.length)];
            const formattedBridge = bridgeText.replace(/{area}/g, this.simulator._getRegionName(quest.region) || "現地")
                .replace(/{target}/g, quest.target || "ターゲット");

            // --- CLIMAX LOG Removed (Moved to Simulator for correct order) ---

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

        // 1. Base Completion Reward (Flatter Curve)
        // E:6, D:7, C:9, B:12, A:14, S:20
        const baseRewardTable = [0, 6, 7, 9, 12, 14, 20];
        const baseReward = baseRewardTable[qRankVal] || 6;

        // 2. Underdog Bonus & Gap Penalty
        // Calculate Adventurer's equivalent Rank Value (0-5) using New Thresholds
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
            // Underdog: +20% per rank difference
            underdogBonus = baseReward * (diff * 0.2);
        } else if (diff < 0) {
            // Gap Penalty: -40% per rank difference
            gapPenaltyRate = Math.max(0, 1.0 + (diff * 0.4));
        }

        // 3. Surprise Bonus (Minor kicker for low-odds wins)
        const surpriseFactor = Math.max(0, 1.0 - chance);
        const surpriseBonus = baseReward * surpriseFactor * 0.5;

        // Total Delta
        let delta = (baseReward + underdogBonus + surpriseBonus) * gapPenaltyRate;

        // 4. Diminishing Returns (Only at very high ranks: 850+)
        if (adv.rankValue > 850) {
            const ratio = Math.max(0, (1050 - adv.rankValue) / 150);
            delta *= ratio;
        }

        // Training Effect: Growth bonus for Rank C or lower
        // C rank value threshold is < 380 (B is 380). Actually C is 200-379. D is 80-199. E is <80.
        // Training is for C and below.
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

        // Rep: Standard = BaseRep * Size * Days
        const rewardRep = Math.floor((difficulty.baseRep || 1) * partySize * days);

        const q = new Quest(
            `tourney_${this.questCounter}`, title, type, difficulty, {},
            { money: rewardMoney, reputation: rewardRep },
            { money: 0, reputation: 0 }, // No Penalty
            partySize, days, 100, // Danger 100%
            {}
        );
        q.entryFee = 0;
        q.expiresInDays = null; // Infinite
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

        // Training Effect: Stat Growth +10% * Lv for Rank C or lower
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
