import { Guild } from './models/Guild.js';
import { GameLoop } from './core/GameLoop.js';
import { UIManager } from './ui/UIManager.js';
import { Layout } from './ui/Layout.js';
import { QuestService } from './services/QuestService.js';
import { MailService } from './services/MailService.js';
import { RecruitmentService } from './services/RecruitmentService.js';
import { TitleService } from './services/TitleService.js';
import { ManagementService } from './services/ManagementService.js';
import { EquipmentService } from './services/EquipmentService.js';
import { MONSTER_DATA } from './data/monsterData.js';
import { ITEM_DATA } from './data/itemData.js';

import { MainScreen } from './ui/screens/MainScreen.js';
import { QuestScreen } from './ui/screens/QuestScreen.js';
import { AdventurerScreen } from './ui/screens/AdventurerScreen.js';
import { PlaceholderScreen } from './ui/screens/PlaceholderScreen.js';
import { QuestHistoryScreen } from './ui/screens/QuestHistoryScreen.js';
import { MailScreen } from './ui/screens/MailScreen.js';
import { OperationScreen } from './ui/screens/OperationScreen.js';
import { ArchivesScreen } from './ui/screens/ArchivesScreen.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Data
    const guild = new Guild();
    const questService = new QuestService();
    const mailService = new MailService();
    const titleService = new TitleService(); // Instantiate
    titleService.mailService = mailService; // Inject MailService

    // Inject Dependencies
    questService.titleService = titleService;

    // Load Data for Simulator
    questService.initSimulator(MONSTER_DATA, ITEM_DATA);
    // console.log("Quest Simulator Initialized with JS data.");

    // 2. Initialize UI Manager
    const uiManager = new UIManager(guild, null);

    // 3. Initialize Layout
    const layout = new Layout(uiManager);
    uiManager.setLayout(layout);

    // 4. Initialize Management Service (Needs UI)
    const managementService = new ManagementService(uiManager);
    const equipmentService = new EquipmentService();
    const recruitmentService = new RecruitmentService(guild);

    // 5. Initialize GameLoop
    const gameLoop = new GameLoop(guild, uiManager, questService, mailService, managementService, equipmentService, recruitmentService);
    // Bind global mail service to gameLoop for easy access (used by MailScreen)
    gameLoop.mailService = mailService;
    // 5. Register Screens
    uiManager.registerScreen('MAIN', new MainScreen(gameLoop));
    uiManager.registerScreen('MAIL', new MailScreen(gameLoop));
    uiManager.registerScreen('QUESTS', new QuestScreen(gameLoop));
    uiManager.registerScreen('HISTORY', new QuestHistoryScreen(gameLoop));
    uiManager.registerScreen('ADVENTURERS', new AdventurerScreen(gameLoop));
    uiManager.registerScreen('OPERATION', new OperationScreen(gameLoop));
    uiManager.registerScreen('ARCHIVES', new ArchivesScreen(gameLoop)); // Changed
    // Finance removed

    // 6. Bind Global Events
    document.addEventListener('next-day', () => {
        gameLoop.nextDay();
        // Update Mail Badge on day change (if any logic added there)
        const unread = mailService.getUnreadCount();
        layout.updateMailBadge(unread);
    });

    // Mail System Events
    document.addEventListener('mail-updated', () => {
        const unread = mailService.getUnreadCount();
        layout.updateMailBadge(unread);
    });

    // Polling for Toasts (Optimization: Use event instead?)
    setInterval(() => {
        const toast = mailService.getToast();
        if (toast) {
            layout.showToast(toast.title, toast.type);
            // Also update badge as toast usually means new mail
            const unread = mailService.getUnreadCount();
            layout.updateMailBadge(unread);
        }
    }, 500);

    // Initial Badge update
    layout.updateMailBadge(mailService.getUnreadCount());

    // 7. Initial Render
    uiManager.setScreen('MAIN');
});
