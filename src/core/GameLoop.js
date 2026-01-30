import { QuestService } from '../services/QuestService.js';
import { RecruitmentService } from '../services/RecruitmentService.js';
import { AssignmentService } from '../services/AssignmentService.js';
import { LifeEventService } from '../services/LifeEventService.js'; // Added

import { titleService } from '../services/TitleService.js';
import { TYPE_ADVANTAGES, LEAVE_TYPES } from '../data/constants.js';

export class GameLoop {
    constructor(guild, uiManager, questService, mailService, managementService, equipmentService) {
        this.guild = guild;
        this.uiManager = uiManager;
        this.questService = questService || new QuestService();
        this.mailService = mailService;
        this.managementService = managementService;

        // Initialize Title Service
        if (this.mailService) {
            titleService.setMailService(this.mailService);
        }
        this.equipmentService = equipmentService; // Added
        this.recruitmentService = new RecruitmentService(guild);
        this.assignmentService = new AssignmentService(guild, this.questService, uiManager);
        this.lifeEventService = new LifeEventService(uiManager);

        this.activeQuests = [];   // Available on board
        this.ongoingQuests = [];  // Currently being undertaken
        this.plannedQuests = [];  // Planned but not departed
        this.questHistory = [];   // Completed quests archive
    }

    archiveQuest(snapshot) {
        this.questHistory.unshift(snapshot);
        if (this.questHistory.length > 1000) {
            this.questHistory.pop();
        }
    }

    nextDay() {
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
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const q = this.activeQuests[i];
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

        // --- 7. Update UI ---
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
}
