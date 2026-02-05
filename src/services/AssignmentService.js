import { QuestAssignment } from '../models/QuestAssignment.js';
import { ASSIGNMENT_CONFIG } from '../data/constants.js';

/**
 * クエストへの冒険者割り当て（自動・手動）を管理するサービス
 */
export class AssignmentService {
    /**
     * コンストラクタ
     * @param {object} guild - ギルドモデル
     * @param {object} questService - クエストサービス
     * @param {object} uiManager - UIマネージャー
     */
    constructor(guild, questService, uiManager) {
        this.guild = guild;
        this.questService = questService;
        this.uiManager = uiManager;
    }

    /**
     * 自動割り当てを実行し、計画リストを作成します。
     * @param {Array<object>} activeQuests - 募集中のクエストリスト
     * @returns {Array<QuestAssignment>} 作成された割り当て計画リスト
     */
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
            if (totalScore >= targetScore * ASSIGNMENT_CONFIG.AUTO_ASSIGN_THRESHOLD) {
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

    /**
     * 手動割り当てを実行し、計画を作成します。
     * @param {object} quest - 対象クエスト
     * @param {Array<string>} adventurerIds - 冒険者IDリスト
     * @returns {object} 結果オブジェクト { success, message, assignment }
     */
    // 即時出発ではなく、計画 (Planning) を作成する
    manualAssign(quest, adventurerIds) {
        // バリデーション
        if (adventurerIds.length < quest.partySize) {
            return { success: false, message: '人数が不足しています。' };
        }

        // IDごとに有効な冒険者を抽出 (重複・ゴースト対策)
        const adventurers = [];
        for (const id of adventurerIds) {
            // 同じIDを持つ冒険者を全て取得
            const candidates = this.guild.adventurers.filter(a => a.id === id);

            // 有効な(isAvailable)個体を優先して探す
            const valid = candidates.find(a => a.isAvailable());

            if (valid) {
                adventurers.push(valid);
            } else if (candidates.length > 0) {
                // 有効な個体が見つからない場合（全てBusy）
                return { success: false, message: `${candidates[0].name} は現在活動できません。` };
            }
            // IDが見つからない場合は単にスキップ (人数チェックで弾かれる)
        }

        /*
        const adventurers = this.guild.adventurers.filter(a => adventurerIds.includes(a.id));

        // 空き状況チェック
        const busy = adventurers.find(a => !a.isAvailable());
        if (busy) return { success: false, message: `${busy.name} は現在活動できません。` };
        */

        // 計画作成
        const assignment = this._createAssignment(quest, adventurers, true);

        this.uiManager.log(`"${quest.title}" に ${adventurers.map(a => a.name).join(',')} を配置しました。(準備中)`);
        return { success: true, assignment };
    }

    /**
     * 割り当て情報を作成します。
     * @param {object} quest - クエスト
     * @param {Array<object>} members - メンバー
     * @param {boolean} [isManual=false] - 手動フラグ
     * @returns {QuestAssignment} 割り当てオブジェクト
     * @private
     */
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

    /**
     * 割り当て計画を確定し、出発させます。
     * @param {Array<QuestAssignment>} plannedAssignments - 計画リスト
     * @param {Array<QuestAssignment>} ongoingQuests - 進行中リスト
     * @returns {number} 出発したチーム数
     */
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

    /**
     * 割り当て計画をキャンセルします。
     * @param {QuestAssignment} questAssignment - キャンセル対象
     * @param {Array<QuestAssignment>} ongoingQuests - 進行中リスト
     * @param {Array<QuestAssignment>} plannedQuests - 計画リスト
     * @returns {object} 結果
     */
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
