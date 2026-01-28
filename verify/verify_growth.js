import { Adventurer } from '../src/models/Adventurer.js';
import { QuestService } from '../src/services/QuestService.js';
import { ADVENTURER_TYPES, ORIGINS } from '../src/data/constants.js';

console.log("--- Adventurer Growth Verification ---");

const adv = new Adventurer('growth_test', 'Rookie', ADVENTURER_TYPES.WARRIOR, ORIGINS.CENTRAL);
const qs = new QuestService();

// Init Stats
console.log(`Initial: Rank ${adv.rankLabel} (${adv.rankValue}), STR: ${adv.stats.STR.toFixed(1)}`);

// Simulate 50 Quests
// Assume all success for growth check, or mix
console.log("\nSimulating 50 Quests (High Rank)...");

// Mock Quest (Rank B)
// Needs proper structure consistent with new QuestService logic
const mockQuest = {
    id: 'mock_q',
    title: 'Training',
    type: 'HUNT',
    difficulty: { rank: 'B', powerReq: 100, baseReward: 500 },
    weights: { STR: 1.0, VIT: 0.5 },
    rewards: { money: 500, reputation: 10 },
    danger: 50,
    partySize: 1,
    days: 1
};

for (let i = 0; i < 50; i++) {
    // Force success usually?
    // Use QuestService Logic
    const result = qs.attemptQuest(mockQuest, [adv]);

    if (i % 10 === 0) {
        console.log(`[Quest ${i}] Rank: ${adv.rankLabel} (${Math.floor(adv.rankValue)}), STR: ${adv.stats.STR.toFixed(1)}, Result: ${result.success ? 'WIN' : 'LOSE'}`);
    }
}

console.log(`\nFinal: Rank ${adv.rankLabel} (${Math.floor(adv.rankValue)}), STR: ${adv.stats.STR.toFixed(1)}`);

// Check logic
if (adv.stats.STR > 35) console.log("SUCCESS: Stats grew.");
if (adv.rankValue > 100) console.log("SUCCESS: Rank increased.");

console.log("\n--- Verification Complete ---");
