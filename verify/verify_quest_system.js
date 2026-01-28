import { QuestService } from '../src/services/QuestService.js';
import { Adventurer } from '../src/models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS } from '../src/data/constants.js';

console.log("--- Quest System Phase 7 Verification ---");

const qs = new QuestService();

// 1. Verify Generation
console.log("\n1. Generating 10 quests...");
const quests = qs.generateDailyQuests(1, 200); // Day 1, Rep 200 (should give ~7 quests)
quests.forEach(q => {
    console.log(`[${q.difficulty.rank}] ${q.title} | Party: ${q.partySize}, Days: ${q.days}, Danger: ${q.danger}`);
    if (!q.partySize || !q.days) console.error("ERROR: Missing partySize or days");
});

// 2. Verify Score & Attempt
console.log("\n2. Simulating Quest Attempt...");
// Create Party
const p1 = new Adventurer('a1', 'Tank', ADVENTURER_TYPES.WARRIOR, ORIGINS.NORTH); // High Vitality
const p2 = new Adventurer('a2', 'Healer', ADVENTURER_TYPES.PRIEST, ORIGINS.CENTRAL);
const p3 = new Adventurer('a3', 'DPS', ADVENTURER_TYPES.MAGE, ORIGINS.EAST); // High Mag
const party = [p1, p2, p3];

console.log("Party:", party.map(p => `${p.name}(${p.type})`).join(', '));

// Create a quest manually to control variables
// Rank B quest, needs ~3 people?
const testQuest = quests.find(q => q.difficulty.rank === 'C' || q.difficulty.rank === 'B') || quests[0];
console.log(`Testing against Quest: ${testQuest.title} (Rank ${testQuest.difficulty.rank}, PowerReq ${testQuest.difficulty.powerReq})`);

// Calculate Score
const score1 = qs.calculateScore(testQuest, p1);
const score2 = qs.calculateScore(testQuest, p2);
const score3 = qs.calculateScore(testQuest, p3);
console.log(`Scores: ${score1.toFixed(1)}, ${score2.toFixed(1)}, ${score3.toFixed(1)}`);

// Attempt 100 times
let successes = 0;
let accidents = 0;
let injured = 0;

for (let i = 0; i < 100; i++) {
    const res = qs.attemptQuest(testQuest, party);
    if (res.success) successes++;

    res.memberResults.forEach(mr => {
        if (mr.status === 'INJURED') injured++;
    });
}

console.log(`\nResults (100 runs):`);
console.log(`Success Rate: ${successes}%`);
console.log(`Total Injuries: ${injured}`);
console.log(`Avg Injuries per run: ${(injured / 100).toFixed(2)}`);

if (successes > 0 && successes < 100) console.log("SUCCESS: Variance observed.");
if (injured > 0) console.log("SUCCESS: Accidents observed.");

console.log("\n--- Verification Complete ---");
