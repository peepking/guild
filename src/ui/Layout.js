export class Layout {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.appContainer = document.getElementById('app');
        this.setupStructure();
    }

    setupStructure() {
        this.appContainer.innerHTML = `
            <header id="top-bar" class="top-bar">
                <div class="stats-wrapper" style="display:flex; gap:1.5rem; align-items:center;">
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
                        <span id="display-policy" class="stat-value" style="font-size:0.9rem; min-width:auto;">Balanced</span>
                    </div>
                    
                    <div id="display-event-container" class="stat-group hidden" style="color:#ffcc80;">
                        <span style="font-size:1.2em;">⚠️</span>
                        <span id="display-event" style="font-weight:bold; font-size:0.9em; margin-left:0.2rem;">Event</span>
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
                <button data-screen="MAIN" class="nav-btn active">メイン</button>
                <div class="nav-wrapper">
                    <button data-screen="MAIL" class="nav-btn" id="nav-btn-mail">郵便</button>
                    <span id="mail-badge" class="badge hidden">0</span>
                </div>
                <button data-screen="QUESTS" class="nav-btn">依頼</button>
                <button data-screen="HISTORY" class="nav-btn">履歴</button>
                <button data-screen="ADVENTURERS" class="nav-btn">冒険者</button>
                <button data-screen="OPERATION" class="nav-btn">運営</button>
                <button data-screen="ARCHIVES" class="nav-btn">資料</button>
            </nav>
            
            <!-- Toast Container -->
            <div id="toast-container" class="toast-container"></div>
        `;

        // Bind events
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

    renderTopBar(guild) {
        document.getElementById('display-day').textContent = guild.day;
        document.getElementById('display-money').textContent = `${guild.money} G`;
        document.getElementById('display-reputation').textContent = guild.reputation;

        // Policy
        const pName = { BALANCED: '標準', AGGRESSIVE: '利益', SAFE: '安全', TRAINING: '育成', COMMERCIAL: '商業' };
        document.getElementById('display-policy').textContent = pName[guild.activePolicy] || guild.activePolicy;

        // Event
        const eventContainer = document.getElementById('display-event-container');
        const eventText = document.getElementById('display-event');

        if (guild.activeEvents && guild.activeEvents.length > 0) {
            const evt = guild.activeEvents[0];
            eventText.textContent = evt.name;
            eventContainer.classList.remove('hidden');
            // Tooltip
            eventContainer.title = `${evt.name}: ${evt.description}`;
        } else {
            eventContainer.classList.add('hidden');
        }
    }

    updateNav(currentScreen) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            if (btn.getAttribute('data-screen') === currentScreen) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // New: Toast Method
    showToast(message, type = 'NORMAL') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type.toLowerCase()}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    updateMailBadge(count) {
        const badge = document.getElementById('mail-badge');
        if (badge) {
            badge.textContent = count;
            if (count > 0) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }
    }
}
