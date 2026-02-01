import { QuestAssignment } from '../models/QuestAssignment.js';

export class AssignmentService {
    constructor(guild, questService, uiManager) {
        this.guild = guild;
        this.questService = questService;
        this.uiManager = uiManager;
    }

    // --- 自動割り当て (Daily) ---
    // 計画リスト (QuestAssignment) を返すが、ongoingQuests には追加しない
    autoAssign(activeQuests) {
        const availableAdventurers = this.guild.adventurers.filter(a => a.isAvailable());
        if (availableAdventurers.length === 0) return [];

        availableAdventurers.sort(() => Math.random() - 0.5);
        const questsToCheck = [...activeQuests].sort(() => Math.random() - 0.5);
        const plannedAssignments = [];
        const assignedQuestIds = [];

        questsToCheck.forEach(quest => {
            // 手動専用はスキップ
            if (quest.manualOnly) return;
            // 既に割り当て済みの場合はスキップ
            if (assignedQuestIds.includes(quest.id)) return;

            const size = quest.partySize || 1;
            // 候補者のフィルタリング (このバッチで選出済みの者を除く)
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

            // 自動採用閾値: 要求の90%
            if (totalScore >= targetScore * 0.9) {
                const members = party.map(c => c.adv);

                // 計画作成
                const assignment = this._createAssignment(quest, members, false);
                plannedAssignments.push(assignment);
                assignedQuestIds.push(quest.id);

                this.uiManager.log(`${members.map(m => m.name).join(',')} は "${quest.title}" を計画しました。(自動)`);
            }
        });

        return plannedAssignments;
    }

    // --- 手動割り当て ---
    // 即時出発ではなく、計画 (Planning) を作成する
    manualAssign(quest, adventurerIds) {
        // バリデーション
        if (adventurerIds.length < quest.partySize) {
            return { success: false, message: '人数が不足しています。' };
        }

        const adventurers = this.guild.adventurers.filter(a => adventurerIds.includes(a.id));

        // 空き状況チェック
        const busy = adventurers.find(a => !a.isAvailable());
        if (busy) return { success: false, message: `${busy.name} は現在活動できません。` };

        // 計画作成
        const assignment = this._createAssignment(quest, adventurers, true);

        this.uiManager.log(`"${quest.title}" に ${adventurers.map(a => a.name).join(',')} を配置しました。(準備中)`);
        return { success: true, assignment };
    }

    _createAssignment(quest, members, isManual = false) {
        // ステータスを PLANNING に設定
        members.forEach(m => m.state = "PLANNING");
        quest.assignedAdventurerIds = members.map(m => m.id);

        const assignment = new QuestAssignment(quest, members);

        // ギルド報酬配分ルールの適用
        if (isManual && !quest.guildShareRule.specialNoShift) {
            assignment.guildCutRate = quest.guildShareRule.baseGuildShare - quest.guildShareRule.manualPenaltyShift;
        } else {
            assignment.guildCutRate = quest.guildShareRule.baseGuildShare;
        }
        return assignment;
    }

    // --- 割り当て確定 (出発) ---
    confirmAssignments(plannedAssignments, ongoingQuests) {
        let count = 0;
        plannedAssignments.forEach(assignment => {
            // ステータスを PLANNING から QUESTING に移行
            assignment.members.forEach(m => m.state = "QUESTING");
            ongoingQuests.push(assignment);
            count++;
        });

        if (count > 0) {
            this.uiManager.log(`${count} チームが出発しました！`);
        }
        return count;
    }

    // --- 割り当てキャンセル ---
    // 計画中のみキャンセル可能。出発後は不可。
    cancelAssignment(questAssignment, ongoingQuests, plannedQuests) { // 引数としてplannedQuestsを追加
        // メンバーの状態を確認
        const isPlanning = questAssignment.members[0].state === 'PLANNING';
        const isQuesting = questAssignment.members[0].state === 'QUESTING';

        if (isQuesting) {
            return { success: false, message: "出発済みの依頼は中止できません。" };
        }

        if (isPlanning) {
            // plannedQuests から削除
            const pIdx = plannedQuests.indexOf(questAssignment);
            if (pIdx !== -1) {
                plannedQuests.splice(pIdx, 1);
            }

            // 冒険者を IDLE に戻す
            questAssignment.members.forEach(adv => {
                adv.state = "IDLE";
                // キャンセルペナルティなし
            });
            // クエスト割り当て情報をクリア
            questAssignment.quest.assignedAdventurerIds = [];

            this.uiManager.log(`"${questAssignment.quest.title}" の計画を取り消しました。`, 'warning');
            return { success: true };
        }

        return { success: false, message: "不明なステータスです。" };
    }
}
