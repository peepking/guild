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
    // 1. データ初期化
    const guild = new Guild();
    const questService = new QuestService();
    const mailService = new MailService();
    const titleService = new TitleService(); // インスタンス化
    titleService.mailService = mailService; // MailServiceを注入

    // 依存関係の注入
    questService.titleService = titleService;

    // シミュレーター用データの読み込み
    questService.initSimulator(MONSTER_DATA, ITEM_DATA);
    // console.log("Quest Simulator Initialized with JS data.");

    // 2. UIマネージャーの初期化
    const uiManager = new UIManager(guild, null);

    // 3. レイアウトの初期化
    const layout = new Layout(uiManager);
    uiManager.setLayout(layout);

    // 4. 管理サービスの初期化 (UIが必要)
    const managementService = new ManagementService(uiManager);
    const equipmentService = new EquipmentService();
    const recruitmentService = new RecruitmentService(guild);

    // 5. ゲームループの初期化
    const gameLoop = new GameLoop(guild, uiManager, questService, mailService, managementService, equipmentService, recruitmentService);
    // グローバルなメールサービスをGameLoopにバインド (MailScreenで使用)
    gameLoop.mailService = mailService;
    // 5. 画面の登録
    uiManager.registerScreen('MAIN', new MainScreen(gameLoop));
    uiManager.registerScreen('MAIL', new MailScreen(gameLoop));
    uiManager.registerScreen('QUESTS', new QuestScreen(gameLoop));
    uiManager.registerScreen('HISTORY', new QuestHistoryScreen(gameLoop));
    uiManager.registerScreen('ADVENTURERS', new AdventurerScreen(gameLoop));
    uiManager.registerScreen('OPERATION', new OperationScreen(gameLoop));
    uiManager.registerScreen('ARCHIVES', new ArchivesScreen(gameLoop)); // 変更あり
    // 財務画面は削除

    // 6. グローバルイベントのバインド
    document.addEventListener('next-day', () => {
        gameLoop.nextDay();
        // 日付変更時にメールバッジを更新 (ロジックが追加された場合)
        const unread = mailService.getUnreadCount();
        layout.updateMailBadge(unread);
    });

    // メールシステムイベント
    document.addEventListener('mail-updated', () => {
        const unread = mailService.getUnreadCount();
        layout.updateMailBadge(unread);
    });

    // トースト通知のポーリング (最適化: イベント使用を検討?)
    setInterval(() => {
        const toast = mailService.getToast();
        if (toast) {
            layout.showToast(toast.title, toast.type);
            // トーストは通常新規メールを意味するためバッジも更新
            const unread = mailService.getUnreadCount();
            layout.updateMailBadge(unread);
        }
    }, 500);

    // 初回バッジ更新
    layout.updateMailBadge(mailService.getUnreadCount());

    // 7. 初期描画
    uiManager.setScreen('MAIN');
});
