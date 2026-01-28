import { Adventurer } from '../src/models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS, JOIN_TYPES } from '../src/data/constants.js';

console.log("--- Initial Stats Balance Verification ---");

// Helper to Create specific Rank Adventurer (approx)
function createAdv(targetRankVal, type) {
    // Hack: We can't easily force rankValue in constructor without mocking random.
    // Instead, we'll instantiate and then manually re-generate stats with specific rank value.
    const adv = new Adventurer('test', 'Test', type, ORIGINS.CENTRAL, JOIN_TYPES.WANDERER);
    adv.rankValue = targetRankVal;
    adv.stats = adv._generateStats(type, ORIGINS.CENTRAL, targetRankVal);
    return adv;
}

const ranks = [0, 200, 500, 800, 950]; // E, D, B, A, S approx
const results = {};

console.log("\nGenerating samples across ranks...");

ranks.forEach(rVal => {
    let sumTotal = 0;
    let count = 0;

    for (let i = 0; i < 50; i++) {
        const adv = createAdv(rVal, ADVENTURER_TYPES.WARRIOR);
        const sum = Object.values(adv.stats).reduce((a, b) => a + b, 0);
        sumTotal += sum;
        count++;
    }

    results[rVal] = sumTotal / count;
    console.log(`RankValue ${rVal}: Avg Sum = ${results[rVal].toFixed(1)}`);
});

// Assert Growth
console.log("\nChecking Progression:");
let prevSum = 0;
let success = true;
ranks.forEach(rVal => {
    const sum = results[rVal];
    if (sum <= prevSum) {
        console.error(`FAILURE: Rank ${rVal} (Sum ${sum}) is not greater than Previous (Sum ${prevSum})`);
        success = false;
    } else if (prevSum > 0) {
        console.log(`SUCCESS: Rank ${rVal} > Previous (+${(sum - prevSum).toFixed(1)})`);
    }
    prevSum = sum;
});

if (success) console.log("\nVERIFICATION PASSED: Stats scale with Rank.");
else console.error("\nVERIFICATION FAILED: Inconsistent scaling.");
