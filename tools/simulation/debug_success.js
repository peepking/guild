
import { Quest } from '../../src/models/Quest.js';
import { Adventurer } from '../../src/models/Adventurer.js';
import { QuestService } from '../../src/services/QuestService.js';
import { RecruitmentService } from '../../src/services/RecruitmentService.js';
import { QUEST_DIFFICULTY } from '../../src/data/constants.js';
import { QUEST_SPECS } from '../../src/data/QuestSpecs.js';
import { Guild } from '../../src/models/Guild.js';

// Mock dependencies
const mockGame = {
    simulator: { monsters: {}, items: {} }
};
const guild = new Guild();
const qs = new QuestService(mockGame);
const rs = new RecruitmentService(guild);

console.log("=== Success Chance Debug ===");

// 1. Generate E-Rank Quests
const eRankQuests = [];
for (let i = 0; i < 5; i++) {
    const q = qs._createRandomQuest(1, 'E');
    // Ensure E rank
    if (q.difficulty.rank === 'E') eRankQuests.push(q);
}

console.log(`Generated ${eRankQuests.length} E-Rank Quests.`);

// 2. Generate E-Rank Adventurers
const adventurers = [];
// Local recruits (usually E)
for (let i = 0; i < 5; i++) {
    // Generate valid candidate data manually to avoid complex service dependencies if needed
    // But let's try using rs._generateCandidate if possible, or public method.
    // rs.generateCandidates returns candidates.
    // rs.generateNewAdventurer returns a single adventurer
    const adv = rs.generateNewAdventurer();
    if (adv) {
        adventurers.push(adv);
    }

}

console.log(`Generated ${adventurers.length} Adventurers.`);
adventurers.forEach(a => {
    const totalStats = Object.values(a.stats).reduce((sum, v) => sum + v, 0);
    console.log(`- ${a.name} (${a.job}): Total Stats ${totalStats} ${JSON.stringify(a.stats)}`);
});

// 3. Test Success Rates
console.log("\n--- Testing Matches ---");
eRankQuests.forEach(q => {
    console.log(`\nQuest: ${q.title} (Type: ${q.type}, Weights: ${JSON.stringify(q.weights)})`);
    console.log(`Target Power: ${q.difficulty.powerReq}`);

    adventurers.forEach(a => {
        // Calculate manually to debug
        let raw = 0;
        for (const [s, w] of Object.entries(q.weights)) {
            raw += (a.stats[s] || 0) * w;
        }

        // Use service
        const chance = qs.calculateSuccessChance(q, [a]);

        console.log(`  vs ${a.name}: Chance ${(chance * 100).toFixed(1)}% (Raw Score: ${raw}, Delta: ${raw - q.difficulty.powerReq})`);
    });
});
