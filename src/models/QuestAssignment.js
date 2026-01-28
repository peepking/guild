export class QuestAssignment {
    constructor(quest, members, guildCutRate = 0.3) {
        this.quest = quest; // Store full quest object for easy access
        this.questId = quest.id;
        this.members = members; // Array of Adventurer objects
        this.remainingDays = quest.days;
        this.guildCutRate = guildCutRate; // Default 30% (Manual 20% in future)
        this.status = 'active'; // active, completed, failed
        this.logs = []; // Daily logs for this specific mission
    }

    nextDay() {
        if (this.status !== 'active') return;
        this.remainingDays--;
    }

    isFinished() {
        return this.remainingDays <= 0;
    }
}
