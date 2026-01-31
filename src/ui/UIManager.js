export class UIManager {
    constructor(guild, renderer) {
        this.guild = guild;
        this.renderer = renderer; // Keep renderer for utility if needed
        this.currentScreen = null;
        this.state = {
            questsTab: 'NORMAL',
            selectedQuestId: null,
            selectedAdventurerId: null,
            financeTab: 'DAILY'
        };

        this.screens = {};
        this.layout = null;
        this.logs = []; // Central Log Store
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

    // --- Interface for GameLoop ---
    log(message, type = 'normal') {
        const entry = { message, type, day: this.guild.day };
        this.logs.unshift(entry); // Newest first
        if (this.logs.length > 50) this.logs.pop(); // Keep last 50
    }

    showToast(message, type = 'NORMAL') {
        if (this.layout) {
            this.layout.showToast(message, type);
        }
    }

    render() {
        // 1. Render Layout (TopBar, BottomNav updates)
        if (this.layout) {
            this.layout.renderTopBar(this.guild);
            this.layout.updateNav(this.currentScreen);
        }

        // 2. Render Current Screen
        const screen = this.screens[this.currentScreen];
        const container = document.getElementById('screen-container');

        if (screen && container) {
            container.innerHTML = ''; // Clear current
            container.className = 'screen-container'; // Reset classes to base
            container.removeAttribute('style'); // Clear injected styles (grid, etc)
            screen.render(container, this.guild, this.state, this.logs);
        } else {
            console.error(`Screen ${this.currentScreen} not found or container missing.`);
        }
    }
}
