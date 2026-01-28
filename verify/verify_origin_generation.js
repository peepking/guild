import { RecruitmentService } from '../src/services/RecruitmentService.js';
import { Guild } from '../src/models/Guild.js';
import { JOIN_TYPES } from '../src/data/constants.js';

console.log("--- Origin & JoinType Generation Verification ---");

const guild = new Guild();
const rs = new RecruitmentService(guild);

// Generate 50 adventurers
console.log("Generating 50 adventurers...");
const batch = [];
for (let i = 0; i < 50; i++) {
    batch.push(rs.generateNewAdventurer());
}

// Analyze Stats
const typeCounts = { LOCAL: 0, WANDERER: 0, CONTRACT: 0 };
const ranks = [];
const trusts = [];

batch.forEach(adv => {
    typeCounts[adv.joinType]++;
    ranks.push({ type: adv.joinType, rank: adv.rankValue, label: adv.rankLabel });
    trusts.push({ type: adv.joinType, trust: adv.trust, origin: adv.origin.id });
});

console.log("\n[Join Type Distribution]");
console.log(`Local: ${typeCounts.LOCAL}, Wanderer: ${typeCounts.WANDERER}, Contract: ${typeCounts.CONTRACT}`);

console.log("\n[Rank Check (Local < Wanderer < Contract?)]");
const avgRank = (type) => {
    const list = ranks.filter(r => r.type === type);
    if (list.length === 0) return 0;
    return list.reduce((sum, r) => sum + r.rank, 0) / list.length;
};
console.log(`Avg Rank Local: ${avgRank(JOIN_TYPES.LOCAL).toFixed(1)} (Target ~80)`);
console.log(`Avg Rank Wanderer: ${avgRank(JOIN_TYPES.WANDERER).toFixed(1)} (Target ~325)`);
console.log(`Avg Rank Contract: ${avgRank(JOIN_TYPES.CONTRACT).toFixed(1)} (Target ~625)`);

console.log("\n[Trust Check (Local > Wanderer > Contract?)]");
const avgTrust = (type) => {
    const list = trusts.filter(r => r.type === type);
    if (list.length === 0) return 0;
    return list.reduce((sum, r) => sum + r.trust, 0) / list.length;
};
console.log(`Avg Trust Local: ${avgTrust(JOIN_TYPES.LOCAL).toFixed(1)}`);
console.log(`Avg Trust Contract: ${avgTrust(JOIN_TYPES.CONTRACT).toFixed(1)}`);

if (avgRank(JOIN_TYPES.CONTRACT) > avgRank(JOIN_TYPES.LOCAL)) console.log("SUCCESS: Contract recruits are stronger.");
if (avgTrust(JOIN_TYPES.LOCAL) > avgTrust(JOIN_TYPES.CONTRACT)) console.log("SUCCESS: Local recruits are more trusted.");

console.log("\n--- Verification Complete ---");
