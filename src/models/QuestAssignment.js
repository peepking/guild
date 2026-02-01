export class QuestAssignment {
    constructor(quest, members, guildCutRate = 0.3) {
        this.quest = quest;
        this.questId = quest.id;
        this.members = members;
        // デフォルト30%
        this.remainingDays = quest.days;
        this.guildCutRate = guildCutRate;
        // active(進行中), completed(完了), failed(失敗)
        this.status = 'active';
        this.logs = [];
    }

    nextDay() {
        if (this.status !== 'active') return;
        this.remainingDays--;
    }

    isFinished() {
        return this.remainingDays <= 0;
    }
}
