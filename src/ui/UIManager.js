export class UIManager {
    constructor(guild, renderer) {
        this.guild = guild;
        this.renderer = renderer; // ユーティリティ用に保持
        this.currentScreen = null;
        this.state = {
            questsTab: 'NORMAL',
            selectedQuestId: null,
            selectedAdventurerId: null,
            financeTab: 'DAILY'
        };

        this.screens = {};
        this.layout = null;
        this.logs = []; // ログストア
    }

    setScreen(screenName) {
        if (this.currentScreen === screenName) return;
        this.currentScreen = screenName;
        this.render();
    }

    registerScreen(name, screenInstance) {
        this.screens[name] = screenInstance;
    }

    setLayout(layoutInstance) {
        this.layout = layoutInstance;
    }

    // --- GameLoop インターフェース ---
    log(message, type = 'normal') {
        const entry = { message, type, day: this.guild.day };
        this.logs.unshift(entry); // 新着順
        if (this.logs.length > 50) this.logs.pop(); // 最新50件のみ保持
    }

    showToast(message, type = 'NORMAL') {
        if (this.layout) {
            this.layout.showToast(message, type);
        }
    }

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
