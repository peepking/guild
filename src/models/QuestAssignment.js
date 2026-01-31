export class QuestAssignment {
    constructor(quest, members, guildCutRate = 0.3) {
        this.quest = quest; // Store full quest object for easy access
        // アクセス容易化のため完全なクエストオブジェクトを保持
        this.questId = quest.id;
        this.members = members; // Array of Adventurer objects
        // 冒険者オブジェクトの配列
        this.remainingDays = quest.days;
        this.guildCutRate = guildCutRate; // Default 30% (Manual 20% in future)
        // デフォルト30% (将来的には手動20%も想定)
        this.status = 'active'; // active, completed, failed
        // active(進行中), completed(完了), failed(失敗)
        this.logs = []; // Daily logs for this specific mission
        // この任務固有の日次ログ
    }

    nextDay() {
        if (this.status !== 'active') return;
        this.remainingDays--;
    }

    isFinished() {
        return this.remainingDays <= 0;
    }
}
