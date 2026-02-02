import { UI_CONSTANTS } from '../data/ui_constants.js';

/**
 * UI全体の状態管理と画面遷移を制御するクラス
 */
export class UIManager {
    /**
     * コンストラクタ
     * @param {object} guild - ギルドデータ
     * @param {object} renderer - レンダラー (ユーティリティ用)
     */
    constructor(guild, renderer) {
        this.guild = guild;
        this.renderer = renderer; // ユーティリティ用に保持
        this.currentScreen = null;
        this.state = {
            questsTab: UI_CONSTANTS.QUEST_TABS.NORMAL,
            selectedQuestId: null,
            selectedAdventurerId: null,
            financeTab: UI_CONSTANTS.FINANCE_TABS.DAILY
        };

        this.screens = {};
        this.layout = null;
        this.logs = []; // ログストア
    }

    /**
     * 画面を切り替えます。
     * @param {string} screenName - 画面ID (UI_CONSTANTS.SCREENS)
     */
    setScreen(screenName) {
        if (this.currentScreen === screenName) return;
        this.currentScreen = screenName;
        this.render();
    }

    /**
     * 画面インスタンスを登録します。
     * @param {string} name - 画面ID
     * @param {object} screenInstance - 画面インスタンス
     */
    registerScreen(name, screenInstance) {
        this.screens[name] = screenInstance;
    }

    /**
     * レイアウト管理者セット
     * @param {Layout} layoutInstance
     */
    setLayout(layoutInstance) {
        this.layout = layoutInstance;
    }

    // --- GameLoop インターフェース ---

    /**
     * ログを追加します。
     * @param {string} message - メッセージ
     * @param {string} type - タイプ ('normal', 'warning' etc)
     */
    log(message, type = 'normal') {
        const entry = { message, type, day: this.guild.day };
        this.logs.unshift(entry); // 新着順
        if (this.logs.length > 50) this.logs.pop(); // 最新50件のみ保持
    }

    /**
     * トースト通知を表示します。
     * @param {string} message - メッセージ
     * @param {string} type - タイプ (NORMAL, ERROR, SUCCESS)
     */
    showToast(message, type = 'NORMAL') {
        if (this.layout) {
            this.layout.showToast(message, type);
        }
    }

    /**
     * 現在の画面を描画します。
     */
    render() {
        // 1. レイアウト描画 (TopBar, BottomNav 更新)
        if (this.layout) {
            this.layout.renderTopBar(this.guild);
            this.layout.updateNav(this.currentScreen);
        }

        // 2. 現在の画面を描画
        const screen = this.screens[this.currentScreen];
        const container = document.getElementById('screen-container');

        if (screen && container) {
            container.innerHTML = ''; // クリア
            container.className = 'screen-container'; // クラスリセット
            container.removeAttribute('style'); // スタイルクリア
            screen.render(container, this.guild, this.state, this.logs);
        } else {
            console.error(`Screen ${this.currentScreen} not found or container missing.`);
        }
    }
}
