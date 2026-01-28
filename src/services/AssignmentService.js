import { QuestAssignment } from '../models/QuestAssignment.js';

export class AssignmentService {
    constructor(guild, questService, uiManager) {
        this.guild = guild;
        this.questService = questService;
        this.uiManager = uiManager;
    }

    // --- Auto Assign (Daily) ---
    // Returns list of QuestAssignment objects (Plan) but DOES NOT add to ongoingQuests
    autoAssign(activeQuests) {
        const availableAdventurers = this.guild.adventurers.filter(a => a.isAvailable());
        if (availableAdventurers.length === 0) return [];

        availableAdventurers.sort(() => Math.random() - 0.5);
        const questsToCheck = [...activeQuests].sort(() => Math.random() - 0.5);
        const plannedAssignments = [];
        const assignedQuestIds = [];

        questsToCheck.forEach(quest => {
            // Skip Manual Only
            if (quest.manualOnly) return;
            // Skip if already assigned in this batch
            if (assignedQuestIds.includes(quest.id)) return;

            const size = quest.partySize || 1;
            // Filter candidates excluding those already picked in this batch
            const candidates = availableAdventurers
                .filter(a => a.isAvailable() && a.state === 'IDLE')
                .map(a => ({
                    adv: a,
                    score: this.questService.calculateScore(quest, a)
                }))
                .sort((a, b) => b.score - a.score);

            if (candidates.length < size) return;

            const party = candidates.slice(0, size);
            const totalScore = party.reduce((sum, c) => sum + c.score, 0);
            const targetScore = quest.difficulty.powerReq * size * 1.0;

            // Auto Threshold: 90% of requirement
            if (totalScore >= targetScore * 0.9) {
                const members = party.map(c => c.adv);

                // Create Plan
                const assignment = this._createAssignment(quest, members, false);
                plannedAssignments.push(assignment);
                assignedQuestIds.push(quest.id);

                this.uiManager.log(`${members.map(m => m.name).join(',')} は "${quest.title}" を計画しました。(自動)`);
            }
        });

        return plannedAssignments;
    }

    // --- Manual Assign ---
    // Now creates a PLAN (Planning state) instead of immediate dispatch
    manualAssign(quest, adventurerIds) {
        // Validation
        if (adventurerIds.length < quest.partySize) {
            return { success: false, message: '人数が不足しています。' };
        }

        const adventurers = this.guild.adventurers.filter(a => adventurerIds.includes(a.id));

        // Availability Check
        const busy = adventurers.find(a => !a.isAvailable());
        if (busy) return { success: false, message: `${busy.name} は現在活動できません。` };

        // Create Plan
        const assignment = this._createAssignment(quest, adventurers, true);

        this.uiManager.log(`"${quest.title}" に ${adventurers.map(a => a.name).join(',')} を配置しました。(準備中)`);
        return { success: true, assignment };
    }

    _createAssignment(quest, members, isManual = false) {
        // Set State to PLANNING
        members.forEach(m => m.state = "PLANNING");
        quest.assignedAdventurerIds = members.map(m => m.id);

        const assignment = new QuestAssignment(quest, members);

        // Apply Guild Share Rule
        if (isManual && !quest.guildShareRule.specialNoShift) {
            assignment.guildCutRate = quest.guildShareRule.baseGuildShare - quest.guildShareRule.manualPenaltyShift;
        } else {
            assignment.guildCutRate = quest.guildShareRule.baseGuildShare;
        }
        return assignment;
    }

    // --- Confirm Assignments (Depart) ---
    confirmAssignments(plannedAssignments, ongoingQuests) {
        let count = 0;
        plannedAssignments.forEach(assignment => {
            // Move state from PLANNING to QUESTING
            assignment.members.forEach(m => m.state = "QUESTING");
            ongoingQuests.push(assignment);
            count++;
        });

        if (count > 0) {
            this.uiManager.log(`${count} チームが出発しました！`);
        }
        return count;
    }

    // --- Cancel Assignment ---
    // Can only cancel if Planning. If Questing, it is forbidden.
    cancelAssignment(questAssignment, ongoingQuests, plannedQuests) { // plannedQuests added as arg
        // Check state of members (assuming all sync)
        const isPlanning = questAssignment.members[0].state === 'PLANNING';
        const isQuesting = questAssignment.members[0].state === 'QUESTING';

        if (isQuesting) {
            return { success: false, message: "出発済みの依頼は中止できません。" };
        }

        if (isPlanning) {
            // Remove from plannedQuests if present
            const pIdx = plannedQuests.indexOf(questAssignment);
            if (pIdx !== -1) {
                plannedQuests.splice(pIdx, 1);
            }

            // Reset Adventurers to IDLE
            questAssignment.members.forEach(adv => {
                adv.state = "IDLE";
                // No penalty for canceling plan
            });
            // Clear quest assignment marker
            questAssignment.quest.assignedAdventurerIds = [];

            this.uiManager.log(`"${questAssignment.quest.title}" の計画を取り消しました。`, 'warning');
            return { success: true };
        }

        return { success: false, message: "不明なステータスです。" };
    }
}
