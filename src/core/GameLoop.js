import { QuestService } from '../services/QuestService.js';
import { RecruitmentService } from '../services/RecruitmentService.js';
import { AssignmentService } from '../services/AssignmentService.js';
import { LifeEventService } from '../services/LifeEventService.js'; // Added

import { titleService } from '../services/TitleService.js';
import { TYPE_ADVANTAGES, LEAVE_TYPES, GUILD_RANK_THRESHOLDS } from '../data/constants.js';

export class GameLoop {
    constructor(guild, uiManager, questService, mailService, managementService, equipmentService, recruitmentService) {
        this.guild = guild;
        this.uiManager = uiManager;
        this.questService = questService || new QuestService();
        this.mailService = mailService;
        this.managementService = managementService;

        // Initialize Title Service
        if (this.mailService) {
            titleService.setMailService(this.mailService);
        }
        this.equipmentService = equipmentService;
        this.recruitmentService = recruitmentService || new RecruitmentService(guild);
        this.assignmentService = new AssignmentService(guild, this.questService, uiManager);
        this.lifeEventService = new LifeEventService(uiManager);

        this.activeQuests = [];   // Available on board
        this.ongoingQuests = [];  // Currently being undertaken
        this.plannedQuests = [];  // Planned but not departed
        this.questHistory = [];   // Completed quests archive

        // Initialize Tournament State
        if (!this.guild.tournament) {
            this.guild.tournament = { solo: 'E', team: 'E' };
        }
    }

    archiveQuest(snapshot) {
        this.questHistory.unshift(snapshot);
        if (this.questHistory.length > 1000) {
            this.questHistory.pop();
        }
    }

    nextDay() {
        // Capture previous Rank for notification
        const prevRankObj = GUILD_RANK_THRESHOLDS.find(r => this.guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];

        this.guild.day++;
        this.uiManager.log(`--- ${this.guild.day}日目 開始 ---`, 'day-start');

        // Finance: Init Today
        this.guild.todayFinance = {
            day: this.guild.day,
            income: 0,
            expense: 0,
            balance: this.guild.money,
            details: []
        };
        this.guild.financeHistory.unshift(this.guild.todayFinance);
        if (this.guild.financeHistory.length > 1000) {
            this.guild.financeHistory.pop();
        }

        // --- 0. Depart Planned Quests (From previous day) ---
        // Fee Check (Tournament)
        for (let i = this.plannedQuests.length - 1; i >= 0; i--) {
            const plan = this.plannedQuests[i];
            if (plan.quest.entryFee) {
                if (this.guild.money >= plan.quest.entryFee) {
                    this.guild.money -= plan.quest.entryFee;
                    this.uiManager.log(`参加費 ${plan.quest.entryFee}G を支払いました。(${plan.quest.title})`);
                } else {
                    this.uiManager.log(`資金不足のため参加費を払えず、依頼をキャンセルしました。(${plan.quest.title})`, 'error');
                    this.assignmentService.cancelAssignment(plan, this.ongoingQuests, this.plannedQuests);
                }
            }
        }

        const departedCount = this.assignmentService.confirmAssignments(this.plannedQuests, this.ongoingQuests);
        this.plannedQuests = []; // Clear
        // departed quests are already not in activeQuests

        // --- 1. Lifecycle & Recovery Checks ---
        for (let i = this.guild.adventurers.length - 1; i >= 0; i--) {
            const adv = this.guild.adventurers[i];

            // Phase 9: Career Growth (Applied Daily)
            adv.careerDays = (adv.careerDays || 0) + 1;

            // Recovery
            if (adv.recoveryDays > 0) {
                // Infirmary Effect: Base 1 + Lv
                const infirmaryLv = (this.guild.facilities && this.guild.facilities.infirmary) || 0;
                const recoveryAmount = 1 + infirmaryLv;

                adv.recoveryDays -= recoveryAmount;
                if (adv.recoveryDays <= 0) {
                    adv.state = "IDLE";
                    adv.recoveryDays = 0; // Clamp
                    this.uiManager.log(`${adv.name} は傷が癒えました。`, 'recover');
                } else {
                    continue;
                }
            }

            // Leave/Retire Check (Only when IDLE)
            if (adv.state === "IDLE" && adv.isAvailable()) {
                // Career Bonus (small drip rank increase for staying)
                // 0.05 * (1 + EMA) * decay
                const ema = adv.perfEMA || 0;
                const cap = Math.max(0, (1000 - adv.rankValue) / 1000);
                let careerBonus = 0.05 * (1 + ema);
                careerBonus *= cap;
                if (careerBonus > 0) adv.updateRank(careerBonus);

                let leaveChance = 0.005; // Base 0.5%
                if (adv.trust < 10) leaveChance += 0.02;
                if (adv.trust > 50) leaveChance -= 0.002;

                if (Math.random() < leaveChance) {
                    let type = LEAVE_TYPES.LEAVE;
                    if (adv.trust > 60) type = LEAVE_TYPES.RETIRE;
                    else if (adv.trust < 0) type = LEAVE_TYPES.DISAPPEAR;

                    const reason = type;
                    this.guild.retiredAdventurers.push({
                        id: adv.id,
                        name: adv.name,
                        type: adv.type,
                        origin: adv.origin,
                        rank: adv.rank,
                        rankValue: adv.rankValue,
                        leftDay: this.guild.day,
                        reason: reason
                    });

                    // Add to Advisor Candidates if Retired
                    if (type === LEAVE_TYPES.RETIRE && this.managementService) {
                        this.managementService.checkAndAddCandidate(this.guild, adv);
                    }

                    this.guild.adventurers.splice(i, 1);
                    this.uiManager.log(`${adv.name} (${adv.origin.name}) がギルドを去りました。[${type}]`, 'leave');
                }
            }
        }

        // --- 1.5 Life Events ---
        this.lifeEventService.processLifeEvents(this.guild);

        // --- 1.6 Management (Policy/Salary/Events) ---
        if (this.managementService) {
            this.managementService.dailyUpdate(this.guild);
        }

        // --- 2. Process Ongoing Quests ---
        // Get Global Modifiers
        const globalMods = this.managementService ? this.managementService.getGlobalModifiers(this.guild) : {};
        // Inject Facilities
        globalMods.facilities = this.guild.facilities;

        for (let i = this.ongoingQuests.length - 1; i >= 0; i--) {
            const assignment = this.ongoingQuests[i];
            assignment.nextDay();

            if (assignment.isFinished()) {
                // Resolution
                const result = this.questService.attemptQuest(assignment.quest, assignment.members, globalMods);
                this._handleQuestResult(result, assignment);
                this.ongoingQuests.splice(i, 1);
            }
        }

        // --- 3. Clean up Expired Quests ---
        // --- 3. Clean up Expired Quests ---
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const q = this.activeQuests[i];

            if (q.expiresInDays === null) continue;

            const expirationDay = (q.createdDay || 0) + (q.expiresInDays || 0);
            if (this.guild.day > expirationDay) {
                this.activeQuests.splice(i, 1);
                this.uiManager.log(`期限切れのため "${q.title}" は取り下げられました。`, 'expire');

                // Archive Expired Quest
                this.archiveQuest({
                    id: q.id,
                    title: q.title,
                    rank: q.difficulty.rank,
                    date: this.guild.day,
                    result: 'EXPIRED',
                    members: [],
                    logs: [],
                    reward: { money: 0, reputation: 0 }
                });
            }
        }

        // --- 4. Generate Daily Quests ---
        const newQuests = this.questService.generateDailyQuests(this.guild.day, this.guild.reputation, this.guild.facilities);
        const tourneyQuests = this.questService.generateTournamentQuests(this.guild.tournament, [...this.activeQuests, ...this.ongoingQuests.map(a => a.quest)]);
        newQuests.push(...tourneyQuests);

        this.activeQuests.push(...newQuests);

        // Cap quests
        if (this.activeQuests.length > 20) {
            const overflow = this.activeQuests.length - 20;
            if (overflow > 0) {
                // Try to remove non-special first
                let removed = 0;
                for (let i = 0; i < this.activeQuests.length; i++) {
                    if (!this.activeQuests[i].isSpecial && removed < overflow) {
                        this.activeQuests.splice(i, 1);
                        removed++;
                        i--;
                    }
                }
                if (this.activeQuests.length > 20) {
                    this.activeQuests = this.activeQuests.slice(-20);
                }
                if (removed > 0) this.uiManager.log("依頼掲示板がいっぱいです！ 古い依頼が破棄されました。");
            }
        }
        this.uiManager.log(`新規依頼が ${newQuests.length} 件 届きました。 (合計: ${this.activeQuests.length}件)`);

        // --- 5. Recruitment ---
        const capacity = 10 + Math.floor(this.guild.reputation / 20);
        const newRecruit = this.recruitmentService.dailyRecruit();

        if (newRecruit) {
            if (this.guild.adventurers.length < capacity) {
                this.guild.adventurers.push(newRecruit);
                this.uiManager.log(`新たな冒険者 ${newRecruit.name} (${newRecruit.origin.name}) が加入しました！`, 'join');
            } else {
                this.uiManager.log(`冒険者 ${newRecruit.name} が加入を希望しましたが、宿舎がいっぱいのため断りました。 (定員: ${capacity})`, 'warning');
            }
        }

        // --- 6. Auto Assign Plan (For Tomorrow) ---
        // New plans for remaining IDLE adventurers
        this.plannedQuests = this.assignmentService.autoAssign(this.activeQuests);

        const plannedIds = this.plannedQuests.map(p => p.quest.id);
        if (this.plannedQuests.length > 0) {
            // Move to "Planned" list. Remove from "Available".
            this.activeQuests = this.activeQuests.filter(q => !plannedIds.includes(q.id));
        }

        // --- Rank Up Check ---
        const newRankObj = GUILD_RANK_THRESHOLDS.find(r => this.guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        if (newRankObj.threshold > prevRankObj.threshold) {
            this.uiManager.log(`ギルドランクが【${newRankObj.label}】に昇格しました！`, 'event');
            if (this.mailService) {
                this.mailService.send(
                    'ギルドランク昇格のお知らせ',
                    `おめでとうございます。\nギルドの評判が高まり、ランクが【${newRankObj.label}: ${newRankObj.name}】に昇格しました。\n\nより高難易度の依頼が舞い込むようになるでしょう。\n今後ともギルドの発展に尽力してください。`,
                    'IMPORTANT',
                    { day: this.guild.day }
                );
            }
        }

        // --- 6. Check Daily Events (Scout, Apprentice) ---
        if (this.recruitmentService) {
            this.recruitmentService.checkDailyEvents(this.guild.day, this.mailService);
        }

        // --- 7. Monthly Award Event (Day % 30) ---
        if (this.guild.day % 30 === 0 && this.guild.day > 0) {
            this._handleMonthlyAward();
        }

        // --- 8. Update UI ---
        this.uiManager.render();
    }



    _handleQuestResult(result, assignment) {
        if (result.success) {
            let cutRate = assignment.guildCutRate;
            if (result.effectiveShareMod) {
                cutRate *= result.effectiveShareMod;
            }
            const guildCut = Math.floor(result.reward.money * cutRate);
            this.guild.money += guildCut;

            // Finance Logging
            const today = this.guild.todayFinance;
            if (today) {
                today.income += guildCut;
                today.balance = this.guild.money;
                today.details.push({
                    reason: `依頼達成: ${result.quest.title}`,
                    amount: guildCut
                });
            }

            this.guild.reputation += result.reward.reputation;

            // Distribute remaining reward to party
            const partyShare = result.reward.money - guildCut;
            if (partyShare > 0 && result.party.length > 0) {
                const perMember = Math.floor(partyShare / result.party.length);
                result.party.forEach(adv => {
                    adv.personalMoney = (adv.personalMoney || 0) + perMember;
                    adv.trust += 1;
                });
            } else {
                result.party.forEach(adv => adv.trust += 1);
            }

            // Equipment Upgrade Chance (30%)
            if (this.equipmentService) {
                result.party.forEach(adv => {
                    if (Math.random() < 0.3) { // 30% chance to try shopping
                        const upg = this.equipmentService.upgradeEquipment(adv);
                        if (upg.success) {
                            this.uiManager.log(`${adv.name} は新装備「${upg.equipment.name}」を購入しました。(-${upg.cost}G)`, 'info');
                        }
                    }
                });
            }

            let msg = `クエスト達成! "${result.quest.title}" ギルド収入: +${guildCut}G`;
            if (result.reward.breakdown) {
                const bd = result.reward.breakdown;
                msg += ` (基本:${bd.base} + 討伐:${bd.freeHunt} + 素材:${bd.materials})`;
            } else {
                msg += ` (報酬総額: ${result.reward.money}G)`;
            }
            this.uiManager.log(msg, 'success');

            // Tournament Completion
            if (result.quest.isTournament) {
                const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
                const currentRank = result.quest.difficulty.rank;
                const currentRankIdx = ranks.indexOf(currentRank);

                if (currentRankIdx === -1) {
                    console.error("Tournament Rank Error: Invalid Rank", currentRank);
                } else {
                    const nextRankIdx = currentRankIdx + 1;
                    const nextRank = nextRankIdx < ranks.length ? ranks[nextRankIdx] : 'COMPLETED';

                    if (result.quest.type === 'TOURNAMENT_SOLO') {
                        this.guild.tournament.solo = nextRank;
                        if (this.mailService) {
                            this.mailService.send('天下一武闘会（個人）制覇通知', `${currentRank}ランク戦を勝利しました！\n次は${nextRank}ランクへの挑戦権が得られます。`, 'IMPORTANT');
                        }
                    } else if (result.quest.type === 'TOURNAMENT_TEAM') {
                        this.guild.tournament.team = nextRank;
                        if (this.mailService) {
                            this.mailService.send('天下一武闘会（団体）制覇通知', `${currentRank}ランク戦を勝利しました！\n次は${nextRank}ランクへの挑戦権が得られます。`, 'IMPORTANT');
                        }
                    }
                }
            }
        } else {
            let penaltyMoney = result.effectivePenalty ? result.effectivePenalty.money : (result.quest.penalty ? result.quest.penalty.money : 0);
            let penaltyRep = result.quest.penalty ? result.quest.penalty.reputation : 0;

            this.guild.money -= penaltyMoney;

            // Finance Logging
            const today = this.guild.todayFinance;
            if (today) {
                today.expense += penaltyMoney;
                today.balance = this.guild.money;
                today.details.push({
                    reason: `違約金: ${result.quest.title}`,
                    amount: -penaltyMoney
                });
            }

            this.guild.reputation -= penaltyRep;
            result.party.forEach(adv => adv.trust -= 2);

            this.uiManager.log(`クエスト失敗... "${result.quest.title}" 違約金: -${penaltyMoney}G`, 'error');
        }

        result.memberResults.forEach(mr => {
            if (mr.status === 'DEAD') {
                const adv = mr.adventurer;
                this.uiManager.log(`【訃報】${adv.name} は任務中に命を落としました...`, 'error');

                this.guild.retiredAdventurers.push({
                    id: adv.id,
                    name: adv.name,
                    type: adv.type,
                    origin: adv.origin,
                    rank: adv.rank,
                    rankValue: adv.rankValue,
                    leftDay: this.guild.day,
                    reason: 'DEATH'
                });

                const idx = this.guild.adventurers.findIndex(a => a.id === adv.id);
                if (idx !== -1) {
                    this.guild.adventurers.splice(idx, 1);
                }

            } else if (mr.status === 'INJURED') {
                mr.adventurer.state = "IDLE";
                mr.adventurer.trust -= 5;
                mr.adventurer.recoveryDays = Math.floor(Math.random() * 5) + 2;
                this.uiManager.log(`${mr.adventurer.name} は負傷しました！ (全治${mr.adventurer.recoveryDays}日)`, 'error');
            } else {
                mr.adventurer.state = "IDLE";
            }
        });

        // Archive
        this.archiveQuest({
            id: result.quest.id,
            title: result.quest.title,
            rank: result.quest.difficulty.rank,
            date: this.guild.day,
            result: result.success ? 'SUCCESS' : 'FAILURE',
            members: result.party.map(a => a.name),
            logs: result.logs,
            reward: result.reward,
            isSpecial: result.quest.isSpecial,
            description: result.quest.description // Added description
        });
    }
    _handleMonthlyAward() {
        if (!this.guild.adventurers || this.guild.adventurers.length === 0) return;

        // 1. Calculate Evaluation Gain per Adventurer
        let candidates = [];
        let maxGain = -9999;

        this.guild.adventurers.forEach(adv => {
            const lastVal = adv.lastPeriodRankValue || adv.rankValue; // Fallback
            const gain = adv.rankValue - lastVal;

            // Update snapshot for next period
            adv.lastPeriodRankValue = adv.rankValue;

            if (gain > maxGain) {
                maxGain = gain;
                candidates = [adv];
            } else if (gain === maxGain) {
                candidates.push(adv);
            }
        });

        // 2. Select Winner
        if (candidates.length > 0 && maxGain > 0) {
            const winner = candidates[Math.floor(Math.random() * candidates.length)];

            // 3. Calculate Bonus (5 * Guild Rank Value)
            // Determine Guild Rank Value (E=1, ..., S=6)
            // Use existing logic to get label since Guild.getRankLabel might not exist
            const rankObj = this.uiManager.layout ?
                (GUILD_RANK_THRESHOLDS.find(r => this.guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1])
                : { label: 'E' }; // Fallback

            const rankValues = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
            const rankVal = rankValues[rankObj.label] || 1;

            const bonus = 5 * rankVal;

            // 4. Apply Bonus
            winner.rankValue += bonus;
            winner.updateRank(0); // Update label

            // 5. Send Mail
            this.mailService.send(
                "【月間表彰】MVP選出",
                `今月のギルド月間MVPは ${winner.name} に決定しました！\n期間中に最も評価を高めた功績を称え、評価値ボーナス +${bonus} を付与します。\n\n獲得評価: ${Math.floor(maxGain)}\n現在のランク: ${winner.rankLabel}`,
                "IMPORTANT",
                { day: this.guild.day }
            );

            this.uiManager.log(`月間MVP: ${winner.name} (Bonus +${bonus})`, 'event');
        }
    }
    handleMailAction(actionId, data) {
        if (actionId === 'SCOUT_ADVENTURER') {
            if (this.recruitmentService) {
                return this.recruitmentService.executeScout(data);
            }
        }
        if (actionId === 'APPRENTICE_JOIN') {
            if (this.recruitmentService) {
                return this.recruitmentService.executeApprentice(data);
            }
        }
        return { success: false, message: '不明なアクションです' };
    }
}
