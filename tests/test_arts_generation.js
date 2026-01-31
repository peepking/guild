
import { Adventurer } from '../src/models/Adventurer.js';
import { ADVENTURER_TYPES, ORIGINS, JOIN_TYPES } from '../src/data/constants.js';
import { RecruitmentService } from '../src/services/RecruitmentService.js';
import { ARTS_DATA } from '../src/data/ArtsData.js';

console.log("Starting Arts Generation Test...");

// 1. Verify ARTS_DATA Integrity
console.log("Checking ARTS_DATA...");
let missingArts = [];
Object.values(ADVENTURER_TYPES).forEach(type => {
    if (!ARTS_DATA[type] || ARTS_DATA[type].length === 0) {
        missingArts.push(type);
    }
});

if (missingArts.length > 0) {
    console.error("Missing ARTS_DATA for:", missingArts);
} else {
    console.log("ARTS_DATA looks complete.");
}

// 2. Test Constructor Generation (High Rank)
console.log("\nTesting Constructor Generation (Rank A)...");
let noArtCount = 0;
for (let i = 0; i < 100; i++) {
    // Force initRank to return high value by mocking or just checking logic?
    // We can pass a very high min/max if we could, but initRank is internal.
    // Instead, we can instantiate and then manually check.
    // Actually, we can just new Adventurer and see if initRank gives high values fortuitously,
    // or subclass/mock.

    // Easier: Just manipulate the instance immediately after creation?
    // No, constructor logic runs ONCE.

    // Let's rely on RecruitmentService which can set maxRankValue.
    // But initRank is random.

    // Let's create an adventurer and FORCE rankValue in constructor? No can do.

    // But wait, we can pass maxRankValue. 
    // If we use JOIN_TYPES.CONTRACT, min is 350.
    // If we rely on random chance to hit > 380.

    const adv = new Adventurer(`test_c_${i}`, "Test", 'WARRIOR', ORIGINS.CENTRAL, JOIN_TYPES.CONTRACT, 9999);
    // Contract: 350-900 + 30 (Central) = 380 - 930.
    // Chance of being < 380 is very low (only if 350 + 0 + 30 = 380... wait min is 380).
    // Min: 350 + 30 = 380.
    // So ALWAYS >= 380.

    if (adv.rankValue >= 380) {
        if (adv.arts.length === 0) {
            console.error(`FAILURE: Rank ${adv.rankValue} but No Arts! Type: ${adv.type}`);
            noArtCount++;
        }
    }
}
console.log(`Constructor Test complete. Failures: ${noArtCount}`);


// 3. Test Rank Up Logic
console.log("\nTesting Rank Up Logic (C -> B)...");
const novice = new Adventurer('novice', 'Novice', 'WARRIOR', ORIGINS.CENTRAL, JOIN_TYPES.LOCAL, 200);
// Likely rank ~50-100.
console.log(`Initial Rank: ${novice.rankValue}, Arts: ${novice.arts.length}`);
novice.rankValue = 379; // Set to brink
novice.updateRank(1); // 380
console.log(`After Update (380): Rank ${novice.rankValue}, Arts: ${novice.arts.length}`);

if (novice.rankValue >= 380 && novice.arts.length < 1) {
    console.error("FAILURE: Rank Up to 380 did not grant Art.");
} else {
    console.log("SUCCESS: Rank Up granted Art.");
}

// 4. Test Scout Logic (Simulation)
console.log("\nTesting Scout Logic...");
const rs = new RecruitmentService({ adventurers: [], softCap: 20, activeBuffs: [], reputation: 5000 });
// Mock Scout Event Candidate
const candidate = {
    id: 'scout_cand',
    name: 'ScoutCand',
    type: 'MAGE',
    origin: ORIGINS.CENTRAL,
    rankValue: 700, // A Rank
    stats: {},
    arts: [] // Empty initially (simulating the bug in triggerScoutEvent)
};

const result = rs.executeScout({ candidate });
const scouted = rs.guild.adventurers.find(a => a.id === 'scout_cand');

if (scouted) {
    console.log(`Scouted Adv Rank: ${scouted.rankValue}`);
    console.log(`Scouted Adv Arts: ${JSON.stringify(scouted.arts)}`);
    if (scouted.arts.length === 0) {
        console.error("FAILURE: Scouted A-Rank has no arts!");
    } else {
        console.log("SUCCESS: Scouted A-Rank acquired art via fix logic.");
    }
} else {
    console.error("Scout failed.");
}
