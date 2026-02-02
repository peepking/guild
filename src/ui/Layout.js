import { GUILD_RANK_THRESHOLDS } from '../data/constants.js';
import { UI_CONSTANTS } from '../data/ui_constants.js';

/**
 * アプリケーションの基本レイアウトを管理するクラス
 */
export class Layout {
    /**
     * コンストラクタ
     * @param {UIManager} uiManager - UIマネージャー
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.appContainer = document.getElementById('app');
        this.setupStructure();
    }

    /**
     * 基本HTML構造をセットアップします。
     */
    setupStructure() {
        this.appContainer.innerHTML = `
            <header id="top-bar" class="top-bar">
                <div class="stats-wrapper">
                    <div class="stat-group">
                        <span class="stat-label">Day</span>
                        <span id="display-day" class="stat-value">1</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">Money</span>
                        <span id="display-money" class="stat-value">0 G</span>
                    </div>
                    <div class="stat-group">
                        <span class="stat-label">Rep</span>
                        <span id="display-reputation" class="stat-value">0</span>
                    </div>
                    
                    <div class="stat-group">
                        <span class="stat-label">方針</span>
                        <span id="display-policy" class="stat-value text-sm min-w-auto">Balanced</span>
                    </div>
                    
                    <div id="display-event-container" class="stat-group hidden text-warning-light">
                        <span class="text-lg">⚠️</span>
                        <span id="display-event" class="event-notice">Event</span>
                    </div>
                </div>

                <div class="action-buttons">
                    <button id="next-day-btn" class="next-day-btn">次の日へ</button>
                </div>
            </header>

            <main id="screen-container" class="screen-container">
                <!-- Screens injected here -->
            </main>

            <nav id="bottom-nav" class="bottom-nav">
                <button data-screen="${UI_CONSTANTS.SCREENS.MAIN}" class="nav-btn active">メイン</button>
                <div class="nav-wrapper">
                    <button data-screen="${UI_CONSTANTS.SCREENS.MAIL}" class="nav-btn" id="nav-btn-mail">郵便</button>
                    <span id="mail-badge" class="badge ${UI_CONSTANTS.CLASSES.HIDDEN}">0</span>
                </div>
                <button data-screen="${UI_CONSTANTS.SCREENS.QUESTS}" class="nav-btn">依頼</button>
                <button data-screen="${UI_CONSTANTS.SCREENS.HISTORY}" class="nav-btn">履歴</button>
                <button data-screen="${UI_CONSTANTS.SCREENS.ADVENTURERS}" class="nav-btn">冒険者</button>
                <button data-screen="${UI_CONSTANTS.SCREENS.OPERATION}" class="nav-btn">運営</button>
                <button data-screen="${UI_CONSTANTS.SCREENS.ARCHIVES}" class="nav-btn">資料</button>
            </nav>
            
            <!-- Toast Container -->
            <div id="toast-container" class="toast-container"></div>
        `;

        // イベントバインド
        document.getElementById('next-day-btn').addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('next-day'));
        });

        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const screen = btn.getAttribute('data-screen');
                this.uiManager.setScreen(screen);
            });
        });
    }

    /**
     * トップバーの表示を更新します。
     * @param {object} guild - ギルドデータ
     */
    renderTopBar(guild) {
        document.getElementById('display-day').textContent = guild.day;
        document.getElementById('display-money').textContent = `${guild.money} G`;

        const rankObj = GUILD_RANK_THRESHOLDS.find(r => guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        document.getElementById('display-reputation').innerHTML = `${guild.reputation} <span class="text-rank-sub">(Rank ${rankObj.label})</span>`;

        // 方針
        const policyLabel = UI_CONSTANTS.POLICY_LABELS[guild.activePolicy] || guild.activePolicy;
        document.getElementById('display-policy').textContent = policyLabel;

        // イベント
        const eventContainer = document.getElementById('display-event-container');
        const eventText = document.getElementById('display-event');

        if (guild.activeEvents && guild.activeEvents.length > 0) {
            const evt = guild.activeEvents[0];
            eventText.textContent = evt.name;
            eventContainer.classList.remove(UI_CONSTANTS.CLASSES.HIDDEN);
            // ツールチップ
            eventContainer.title = `${evt.name}: ${evt.description}`;
        } else {
            eventContainer.classList.add(UI_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    /**
     * ナビゲーションの状態を更新します。
     * @param {string} currentScreen - 現在の画面ID
     */
    updateNav(currentScreen) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.getAttribute('data-screen') === currentScreen) {
                btn.classList.add(UI_CONSTANTS.CLASSES.ACTIVE);
            } else {
                btn.classList.remove(UI_CONSTANTS.CLASSES.ACTIVE);
            }
        });
    }

    /**
     * トースト通知を表示します。
     * @param {string} message - メッセージ
     * @param {string} type - タイプ (NORMAL, ERROR, SUCCESS)
     */
    showToast(message, type = 'NORMAL') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type.toLowerCase()}`;
        toast.textContent = message;

        container.appendChild(toast);

        // 自動削除
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    /**
     * メールバッジ（未読数）を更新します。
     * @param {number} count - 未読数
     */
    updateMailBadge(count) {
        const badge = document.getElementById('mail-badge');
        if (badge) {
            badge.textContent = count;
            if (count > 0) badge.classList.remove(UI_CONSTANTS.CLASSES.HIDDEN);
            else badge.classList.add(UI_CONSTANTS.CLASSES.HIDDEN);
        }
    }
}
