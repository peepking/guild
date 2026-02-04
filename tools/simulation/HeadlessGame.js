
// Mock Globals for Headless
if (typeof global.localStorage === 'undefined') {
    global.localStorage = {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
        clear: () => { }
    };
}
if (typeof global.document === 'undefined') {
    global.document = {
        dispatchEvent: () => { }
    };
}

import { GameLoop } from '../../src/core/GameLoop.js';
import { Guild } from '../../src/models/Guild.js';
import { ManagementService } from '../../src/services/ManagementService.js';
import { RecruitmentService } from '../../src/services/RecruitmentService.js';
import { QuestService } from '../../src/services/QuestService.js';
import { MailService } from '../../src/services/MailService.js';
import { EquipmentService } from '../../src/services/EquipmentService.js';
import { QuestAssignment } from '../../src/models/QuestAssignment.js';
import { MONSTER_DATA } from '../../src/data/monsterData.js';
import { ITEM_DATA } from '../../src/data/itemData.js';

// Mock UI Manager
export class MockUIManager {
    constructor() {
        this.logs = [];
    }

    log(message, type = 'info') {
        this.logs.push({ message, type, date: Date.now() });
    }

    render() {
        // No-op
    }
}

// Mock Mail Service - Fully override to avoid DOM usage
class MockMailService extends MailService {
    constructor() {
        super();
        this.mails = [];
        this.toastQueue = [];
        this.mailCounter = 0;
        this.sentMails = [];
    }

    send(title, body, type = 'NORMAL', meta = {}, actionId = null) {
        this.mailCounter++;
        const mail = {
            id: `mail_${this.mailCounter}`,
            title,
            body,
            type,
            meta,
            actionId, // important for recruiting
            isRead: false,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        // Ensure arrays exist (called from super constructor)
        if (!this.mails) this.mails = [];
        if (!this.sentMails) this.sentMails = [];

        this.mails.unshift(mail);
        this.sentMails.push(mail);
        // No toast, no document.dispatchEvent
    }
}

export class HeadlessGame {
    constructor(seed) {
        this.uiManager = new MockUIManager();
        this.guild = new Guild();

        // Services
        this.mailService = new MockMailService();
        this.managementService = new ManagementService(this.uiManager);
        this.recruitmentService = new RecruitmentService(this.guild);
        this.questService = new QuestService();
        // Initialize simulator data (same as main game)
        this.questService.initSimulator(MONSTER_DATA, ITEM_DATA);
        this.equipmentService = new EquipmentService(this.uiManager);

        // Core Loop
        this.gameLoop = new GameLoop(
            this.guild,
            this.uiManager,
            this.questService,
            this.mailService,
            this.managementService,
            this.equipmentService,
            this.recruitmentService
        );

        // Patch AssignmentService with suggestBestParty for AI use
        this.gameLoop.assignmentService.suggestBestParty = (quest, adventurers) => {
            const size = quest.partySize || 1;
            // Debug
            // console.log(`Suggesting for ${quest.id}. Input: ${adventurers.length}`);
            const candidates = adventurers
                .filter(a => a.isAvailable() && a.state === 'IDLE')
                .map(a => ({
                    adv: a,
                    score: this.questService.calculateScore(quest, a)
                }))
                .sort((a, b) => b.score - a.score);

            if (candidates.length < size) {
                if (this.guild.day === 1) console.log(`[Suggest Fail] Quest ${quest.id} (Size ${size}). Candidates: ${candidates.length} (Input ${adventurers.length})`);
                return null;
            }

            const party = candidates.slice(0, size).map(c => c.adv);

            // Should return QuestAssignment instance
            const assignment = new QuestAssignment(quest, party);
            // Manually set status or properties if needed (AssignmentService sets state to 'PLANNING')
            // But Headless mode helper logic:

            return assignment;
        };

        this.guild.money = 1000;
        this.guild.day = 1;

        // Debug Initial Stats
        console.log("=== Initial Adventurers ===");
        this.guild.adventurers.forEach(a => {
            const total = Object.values(a.stats).reduce((s, v) => s + v, 0);
            console.log(`${a.name}: Total ${total} ${JSON.stringify(a.stats)}`);
        });
        console.log("===========================");
    }

    step() {
        this.gameLoop.nextDay();
    }
}
