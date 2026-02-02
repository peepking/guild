
import { Adventurer } from '../models/Adventurer.js';
import { Quest } from '../models/Quest.js';
import { QuestAssignment } from '../models/QuestAssignment.js';
import { Guild } from '../models/Guild.js';
import { STORAGE_CONFIG } from '../data/constants.js';

/**
 * ゲームデータの保存と読み込みを行うサービス
 */
export class StorageService {
    /**
     * @param {string} key - 保存キー
     */
    constructor(key = STORAGE_CONFIG.KEY) {
        this.key = key;
    }

    /**
     * ゲーム全体の状態を保存
     * @param {GameLoop} gameLoop 
     */
    save(gameLoop) {
        try {
            const data = this._serialize(gameLoop);
            const json = JSON.stringify(data);
            localStorage.setItem(this.key, json);
            console.log(`[Storage] Saved game data. Size: ${json.length} chars`);
            return true;
        } catch (e) {
            console.error('[Storage] Save failed', e);
            return false;
        }
    }

    /**
     * 保存されたデータを読み込み、ゲーム状態を復元
     * @param {GameLoop} gameLoop - 既存のインスタンスにデータを注入
     * @returns {boolean} 成功したかどうか
     */
    load(gameLoop) {
        try {
            const json = localStorage.getItem(this.key);
            if (!json) return false;

            const data = JSON.parse(json);
            this._deserialize(data, gameLoop);
            console.log('[Storage] Loaded game data successfully.');
            return true;
        } catch (e) {
            console.error('[Storage] Load failed', e);
            return false;
        }
    }

    /**
     * データをBase64エンコードされた文字列としてエクスポート
     * @param {GameLoop} gameLoop 
     */
    exportData(gameLoop) {
        try {
            const data = this._serialize(gameLoop);
            const json = JSON.stringify(data);
            // 簡易的な難読化 (Base64)
            return btoa(unescape(encodeURIComponent(json)));
        } catch (e) {
            console.error('[Storage] Export failed', e);
            return null;
        }
    }

    /**
     * 文字列からデータをインポート
     * @param {string} encodedString 
     * @param {GameLoop} gameLoop 
     */
    importData(encodedString, gameLoop) {
        try {
            const json = decodeURIComponent(escape(atob(encodedString)));
            const data = JSON.parse(json);
            this._deserialize(data, gameLoop);
            return true;
        } catch (e) {
            console.error('[Storage] Import failed', e);
            return false;
        }
    }

    /**
     * 保存データを削除
     */
    reset() {
        localStorage.removeItem(this.key);
    }

    /**
     * 保存データが存在するか確認
     * @returns {boolean}
     */
    hasSaveData() {
        return !!localStorage.getItem(this.key);
    }

    // --- Private Serialization Logic ---

    /**
     * ゲームデータをシリアライズします。
     * @param {GameLoop} gameLoop 
     * @returns {object} シリアライズされたオブジェクト
     * @private
     */
    _serialize(gameLoop) {
        return {
            version: 1,
            timestamp: Date.now(),
            guild: gameLoop.guild, // AdventurerなどのクラスインスタンスはJSON.stringifyでプロパティのみになる
            mail: {
                mails: gameLoop.mailService.mails,
                counter: gameLoop.mailService.mailCounter
            },
            quest: {
                counter: gameLoop.questService.questCounter
            },
            loop: {
                activeQuests: gameLoop.activeQuests,
                ongoingQuests: gameLoop.ongoingQuests,
                plannedQuests: gameLoop.plannedQuests,
                questHistory: gameLoop.questHistory,
                // financeHistoryなどはguildに含まれる
            }
        };
    }

    /**
     * データをデシリアライズしてゲーム状態を復元します。
     * @param {object} data 
     * @param {GameLoop} gameLoop 
     * @private
     */
    _deserialize(data, gameLoop) {
        // 1. Guild Restoration
        const savedGuild = data.guild;
        const guild = gameLoop.guild;

        // 基本プロパティのコピー
        Object.assign(guild, savedGuild);

        // 冒険者の再インスタンス化 (メソッド復元のため)
        guild.adventurers = savedGuild.adventurers.map(advData => {
            // コンストラクタを呼ぶが、直後にデータを上書きするため初期値は何でも良い
            // ただしIDなどは正しく渡しておくと安全
            const adv = new Adventurer(advData.id, advData.name, advData.type);
            Object.assign(adv, advData);
            return adv;
        });

        // 引退した冒険者
        if (guild.retiredAdventurers) {
            guild.retiredAdventurers = guild.retiredAdventurers.map(advData => {
                const adv = new Adventurer(advData.id, advData.name, advData.type);
                Object.assign(adv, advData);
                return adv;
            });
        }

        // 顧問 (Advisor) - これらもAdventurerインスタンスとして扱うか？
        // 仕様上、Advisorsは管理情報のみを持つプレーンオブジェクトに近い場合と、
        // 詳細ステータスを持つ完全なインスタンスの場合がある。
        // current implementation suggests they are adventurer-like objects.
        if (guild.advisors) {
            guild.advisors = guild.advisors.map(advData => {
                const adv = new Adventurer(advData.id, advData.name, advData.type);
                Object.assign(adv, advData);
                return adv;
            });
        }

        // 2. Mail Service Restoration
        if (data.mail) {
            gameLoop.mailService.mails = data.mail.mails || [];
            gameLoop.mailService.mailCounter = data.mail.counter || 0;
        }

        // 3. Quest Service Restoration
        if (data.quest) {
            gameLoop.questService.questCounter = data.quest.counter || STORAGE_CONFIG.DEFAULT_QUEST_COUNTER;
        }

        // 4. GameLoop Lists Restoration
        const loopData = data.loop;

        // Helper: Quest Restoration
        const restoreQuest = (qData) => {
            const q = new Quest(qData.id, qData.title, qData.type, qData.difficulty);
            Object.assign(q, qData);
            return q;
        };

        // Active Quests
        gameLoop.activeQuests = (loopData.activeQuests || []).map(restoreQuest);

        // Helper: Assignment Restoration
        // メンバーIDを使って、再生成された guild.adventurers から参照を引き直す
        const restoreAssignment = (assignData) => {
            const quest = restoreQuest(assignData.quest);
            const members = [];

            // assignData.members はオブジェクトの配列（シリアライズされた状態）
            // IDを使って現在のguild.adventurersから検索する
            if (assignData.members) {
                assignData.members.forEach(mDatum => {
                    const found = guild.adventurers.find(a => a.id === mDatum.id);
                    if (found) {
                        members.push(found);
                    } else {
                        console.warn(`[Storage] Adventurer ${mDatum.id} not found for assignment restoration.`);
                        // フォールバック: データから復元してしまう（ただしリストにはいない幽霊になる）
                        const ghost = new Adventurer(mDatum.id, mDatum.name, mDatum.type);
                        Object.assign(ghost, mDatum);
                        members.push(ghost);
                    }
                });
            }

            const assignment = new QuestAssignment(quest, members);
            // その他のプロパティ (startTime, guildCutRate など) をコピー
            Object.assign(assignment, assignData);

            // 重要: Object.assignで members がシリアライズされたデータ（プレーンオブジェクトの配列）で上書きされてしまうため、
            // 参照解決した members で再度上書きする
            assignment.members = members;

            // quest.assignedAdventurerIds の整合性を確保してもよいが、
            // QuestAssignmentコンストラクタなどは自動でやらないので、必要ならここでセット
            // assignmentの中身はassignDataで上書きされているので基本OK

            return assignment;
        };

        // Ongoing / Planned Quests
        gameLoop.ongoingQuests = (loopData.ongoingQuests || []).map(restoreAssignment);
        gameLoop.plannedQuests = (loopData.plannedQuests || []).map(restoreAssignment);

        // History (Plain objects usually, but good to check)
        gameLoop.questHistory = loopData.questHistory || [];
    }
}
