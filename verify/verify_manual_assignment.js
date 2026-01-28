import { Guild } from '../src/models/Guild.js';
import { GameLoop } from '../src/core/GameLoop.js';
import { UIManager } from '../src/ui/UIManager.js';
import { RecruitmentService } from '../src/services/RecruitmentService.js';

// Mock UI Manager
const mockUI = {
    log: (msg, type) => console.log(`[UI] ${msg}`),
    render: () => { }
};

const guild = new Guild();
const gameLoop = new GameLoop(guild, mockUI);

console.log("--- Manual Assignment Verification ---");

// 1. Setup Adventurers
const rs = new RecruitmentService(guild);
const adv1 = rs.generateNewAdventurer();
const adv2 = rs.generateNewAdventurer();
const adv3 = rs.generateNewAdventurer();
guild.adventurers.push(adv1, adv2, adv3);
console.log(`Recruited: ${adv1.name}, ${adv2.name}, ${adv3.name}`);

// 2. Create Special Quest
const specialQuest = gameLoop.questService._createSpecialQuest(1);
console.log(`Generated Quest: ${specialQuest.title} (ManualOnly: ${specialQuest.manualOnly}, Size: ${specialQuest.partySize})`);

// 3. Manual Assign (Fail - Not enough members)
console.log("\n[Test 1] Assigning insufficient members...");
const res1 = gameLoop.assignmentService.manualAssign(specialQuest, [adv1.id], gameLoop.ongoingQuests);
console.log(`Result: ${res1.success ? 'Success' : 'Fail'} (${res1.message})`);

// 4. Manual Assign (Success)
// Force party size to 2 for test if needed, or recruit more
if (specialQuest.partySize > 3) {
    console.log("Reducing party size requirement for test.");
    specialQuest.partySize = 2;
}

console.log("\n[Test 2] Assigning valid party...");
const partyIds = [adv1.id, adv2.id].slice(0, specialQuest.partySize);
const res2 = gameLoop.assignmentService.manualAssign(specialQuest, partyIds, gameLoop.ongoingQuests);
console.log(`Result: ${res2.success ? 'Success' : 'Fail'}`);

if (res2.success) {
    console.log(`Ongoing Quests: ${gameLoop.ongoingQuests.length}`);
    console.log(`Adv1 State: ${adv1.state}`);
}

// 5. Cancel Assignment
console.log("\n[Test 3] Cancelling assignment...");
const assignment = gameLoop.ongoingQuests[0];
const initialTrust = adv1.trust;
gameLoop.assignmentService.cancelAssignment(assignment, gameLoop.ongoingQuests);

console.log(`Ongoing Quests: ${gameLoop.ongoingQuests.length}`);
console.log(`Adv1 State: ${adv1.state}`);
console.log(`Adv1 Trust: ${initialTrust} -> ${adv1.trust} (Expected -2)`);

if (adv1.state === 'IDLE' && adv1.trust < initialTrust) {
    console.log("SUCCESS: Cancellation penalty applied correctly.");
} else {
    console.error("FAILURE: Cancellation state or penalty incorrect.");
}
