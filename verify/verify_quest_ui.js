import { Guild } from '../src/models/Guild.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { UIManager } from '../src/ui/UIManager.js';
import { QuestScreen } from '../src/ui/screens/QuestScreen.js';
import { Adventurer } from '../src/models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS } from '../src/data/constants.js';

// Mock Browser Environment for Event Dispatch
global.document = {
    createElement: (tag) => {
        return {
            className: '',
            style: {},
            appendChild: () => { },
            querySelectorAll: () => [],
            querySelector: () => ({ onclick: null, disabled: false }), // Mock
            innerHTML: '',
            onclick: null
        };
    },
    getElementById: () => ({ addEventListener: () => { }, style: {} }),
    addEventListener: (event, cb) => { },
    dispatchEvent: (event) => console.log(`[Event Dispatched] ${event.type}`)
};
global.Event = class Event { constructor(type) { this.type = type; } };
global.alert = (msg) => console.log(`[Alert] ${msg}`);
global.confirm = () => true;

const guild = new Guild();
const mockUI = {
    log: (msg) => console.log(`[UI] ${msg}`),
    render: () => { }
};
const gameLoop = new GameLoop(guild, mockUI);
const questScreen = new QuestScreen(gameLoop);

console.log("--- Quest Visualization & Manual Assign Verification ---");

// 1. Setup
const adv1 = new Adventurer('a1', 'TestAdv', ADVENTURER_TYPES.WARRIOR, ORIGINS.CENTRAL);
guild.adventurers.push(adv1);
gameLoop.activeQuests = gameLoop.questService.generateDailyQuests(1, 100);
const targetQuest = gameLoop.activeQuests[0];
targetQuest.partySize = 1; // Simplify

console.log(`Quest: ${targetQuest.title} (ID: ${targetQuest.id})`);

// 2. Test Manual Assign (New Signature)
console.log("\n[Test 1] AssignmentService.manualAssign (Service Level)");
const res = gameLoop.assignmentService.manualAssign(targetQuest, [adv1.id]);
console.log(`Service Result: ${res.success}`);
if (res.success && res.assignment) {
    console.log("SUCCESS: Service returned assignment object.");
} else {
    console.error("FAILURE: Service manualAssign failed.");
}

// 3. Test QuestScreen Manual Logic (Simulated)
// We mimic what the button click does
console.log("\n[Test 2] QuestScreen Manual Logic Simulation");
// Reset
// Reset
adv1.state = 'IDLE';
adv1.recoveryDays = 0; // Ensure clean state
guild.adventurers.forEach(a => a.state = 'IDLE'); // Reset everyone to be safe
gameLoop.plannedQuests = [];
// Assume selection matches
questScreen.state.selectedAdventurerIds = [adv1.id];

// Run Logic
console.log("Executing QuestScreen manual assign logic...");
console.log(`[Pre-Call] Guild Adventurers Length: ${guild.adventurers.length}`);
console.log(`[Pre-Call] Adv State: ${guild.adventurers[0].state}`);
console.log(`[Pre-Call] Is same object? ${guild.adventurers[0] === adv1}`);

const result = gameLoop.assignmentService.manualAssign(targetQuest, questScreen.state.selectedAdventurerIds);
if (result.success) {
    gameLoop.plannedQuests.push(result.assignment);
    gameLoop.activeQuests = gameLoop.activeQuests.filter(q => q.id !== targetQuest.id);
    console.log("[Event] Dispatching plan-updated..."); // Simulating what code does
    gameLoop.uiManager.log("UI Updated");
} else {
    console.log("Manual Assign Failed: " + result.message);
    console.log("Adv State: " + guild.adventurers[0].state);
    console.log("Adv Available: " + guild.adventurers[0].isAvailable());
}

console.log(`Planned Quests: ${gameLoop.plannedQuests.length}`);
console.log(`Active Quests: ${gameLoop.activeQuests.filter(q => q.id === targetQuest.id).length}`);

if (gameLoop.plannedQuests.length === 1 && gameLoop.activeQuests.filter(q => q.id === targetQuest.id).length === 0) {
    console.log("SUCCESS: Manual assignment correctly moved quest to planned.");
} else {
    console.error("FAILURE: Manual assignment state update incorrect.");
}

// 4. Test Render Logic (Does it crash?)
console.log("\n[Test 3] Render Logic Check");
try {
    const container = document.createElement('div');
    questScreen.render(container, guild, {});
    console.log("SUCCESS: Render completed without error.");
} catch (e) {
    console.error("FAILURE: Render crashed.", e);
}
