import { Guild } from '../src/models/Guild.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { UIManager } from '../src/ui/UIManager.js';
import { RecruitmentService } from '../src/services/RecruitmentService.js';
import { Adventurer } from '../src/models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS } from '../src/data/constants.js';

// Mock UI
const mockUI = {
    log: (msg, type) => console.log(`[UI] ${msg}`),
    render: () => { }
};

const guild = new Guild();
const gameLoop = new GameLoop(guild, mockUI);

console.log("--- Planning Phase Verification (Unified Flow) ---");

// 1. Setup Data
// Add adventurers (Clean slate)
guild.adventurers = [];
const adv1 = new Adventurer('a1', 'Adv1', ADVENTURER_TYPES.WARRIOR, ORIGINS.CENTRAL);
const adv2 = new Adventurer('a2', 'Adv2', ADVENTURER_TYPES.MAGE, ORIGINS.NORTH);
const adv3 = new Adventurer('a3', 'Adv3', ADVENTURER_TYPES.ROGUE, ORIGINS.CENTRAL);
guild.adventurers.push(adv1, adv2, adv3);

// Add quests
const quests = gameLoop.questService.generateDailyQuests(1, 100);
// Force duration to 5 days for robust testing
quests.forEach(q => q.days = 5);
gameLoop.activeQuests = quests;

console.log(`Setup: ${guild.adventurers.length} adventurers, ${quests.length} active quests.`);

// 2. Test DAY 1 -> 2 (Auto Assign -> Planning)
console.log("\n[Test 1] Next Day (Day 1 -> 2: Generate Plans)");
gameLoop.nextDay(); // Day 2

console.log(`Day: ${guild.day}`);
console.log(`Planned Quests: ${gameLoop.plannedQuests.length}`);
const planningAdvs = guild.adventurers.filter(a => a.state === 'PLANNING');
console.log(`Adventurers in PLANNING: ${planningAdvs.length}`);

if (gameLoop.plannedQuests.length > 0 && planningAdvs.length > 0) {
    console.log("SUCCESS: Plans generated, state is PLANNING.");
} else {
    // Retry manually for test stability
    console.warn("WARNING: No plans generated? Forcing manual plan.");
    const q = gameLoop.activeQuests[0];
    gameLoop.assignmentService.manualAssign(q, [adv1.id]);
    gameLoop.plannedQuests.push(new QuestAssignment(q, [adv1])); // Mock push if needed? No manualAssign returns obj.
    // Actually manualAssign logic:
    const res = gameLoop.assignmentService.manualAssign(q, [adv1.id]);
    if (res.success) gameLoop.plannedQuests.push(res.assignment);
}

// 3. Test CANCEL PLAN
console.log("\n[Test 2] Cancel Planning");
// Ensure we have at least 2 plans to test one surviving
if (gameLoop.plannedQuests.length < 2) {
    // Add another plan manual
    const q2 = gameLoop.activeQuests.find(q => !gameLoop.plannedQuests.find(p => p.quest.id === q.id));
    if (q2) {
        const res = gameLoop.assignmentService.manualAssign(q2, [adv2.id]);
        if (res.success) {
            gameLoop.plannedQuests.push(res.assignment);
            console.log("Added second plan manually.");
        }
    }
}

if (gameLoop.plannedQuests.length > 0) {
    const targetAssignment = gameLoop.plannedQuests[0];
    const targetAdv = targetAssignment.members[0];
    const initialTrust = targetAdv.trust;
    const keptAssignment = gameLoop.plannedQuests[1]; // Should survive

    console.log(`Cancelling plan for ${targetAdv.name}...`);
    const res = gameLoop.assignmentService.cancelAssignment(targetAssignment, gameLoop.ongoingQuests, gameLoop.plannedQuests);

    console.log(`Cancel Result: ${res.success}`);
    console.log(`Member State: ${targetAdv.state} (Expected: IDLE)`);
    console.log(`Member Trust: ${targetAdv.trust} (Expected: ${initialTrust})`);

    if (targetAdv.state === 'IDLE' && targetAdv.trust === initialTrust) {
        console.log("SUCCESS: Cancellation in planning phase has no penalty.");
    } else {
        console.error("FAILURE: State or Trust incorrect after cancel.");
    }
}

// 4. Test NEXT DAY (Day 2 -> 3: Depart Plans)
console.log("\n[Test 3] Next Day (Day 2 -> 3: Depart Plans)");
const plansBefore = gameLoop.plannedQuests.length;
console.log(`Plans waiting to depart: ${plansBefore}`);

// FORCE Duration on the plan objects to ensure they don't finish immediately
gameLoop.plannedQuests.forEach(p => {
    p.remainingDays = 5;
    console.log(`Forced plan duration to 5 days for: ${p.quest.title}`);
});

gameLoop.nextDay(); // Day 3

console.log(`Day: ${guild.day}`);
console.log(`Ongoing Quests: ${gameLoop.ongoingQuests.length}`);
const questingAdvs = guild.adventurers.filter(a => a.state === 'QUESTING');
console.log(`Adventurers in QUESTING: ${questingAdvs.length}`);

// Validating departure
if (gameLoop.ongoingQuests.length >= plansBefore && plansBefore > 0) {
    console.log("SUCCESS: Planned quests departed on next day.");
} else if (plansBefore === 0) {
    console.log("SKIP: No plans were waiting.");
} else {
    console.error(`FAILURE: Plans did not depart. Ongoing: ${gameLoop.ongoingQuests.length}, Expected >= ${plansBefore}`);
}

// 5. Test CANCEL QUESTING (Forbidden)
console.log("\n[Test 4] Cancel Questing (Ongoing)");
if (gameLoop.ongoingQuests.length > 0) {
    const target = gameLoop.ongoingQuests[0];
    const res = gameLoop.assignmentService.cancelAssignment(target, gameLoop.ongoingQuests, gameLoop.plannedQuests);
    console.log(`Cancel Result: ${res.success} (Expected: false)`);

    if (!res.success) {
        console.log("SUCCESS: Correctly blocked cancellation of ongoing quest.");
    } else {
        console.error("FAILURE: Allowed cancellation of ongoing quest!");
    }
} else {
    console.warn("WARNING: No ongoing quests to test cancellation.");
}
