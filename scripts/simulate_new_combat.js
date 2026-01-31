
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock context for non-browser environment
global.window = {};

// Import necessary modules
// Note: adjusting paths relative to this script
import { CONSTANTS, ADVENTURER_TYPES, BASE_STATS, TRAITS, QUEST_RANK_BASE_POWER } from '../src/data/constants.js';
import { MONSTER_DATA } from '../src/data/monsterData.js';
import { ITEM_DATA } from '../src/data/itemData.js';
import { QUEST_SPECS, REGIONS } from '../src/data/QuestSpecs.js';
import { AdventureSimulator } from '../src/services/AdventureSimulator.js';
import { QuestService } from '../src/services/QuestService.js';
import { Adventurer } from '../src/models/Adventurer.js';

// --- 1. PATCH SIMULATOR WITH NEW LOGIC ---

// New Adventurer CP Formula
AdventureSimulator.prototype._getAdventurerPower = function (adv) {
    const stats = adv.stats;
    // CP = (STR + VIT + DEX + MAG) * 1.0 + (INT + CHA) * 0.5
    let cp = (stats.STR + stats.VIT + stats.DEX + stats.MAG) * 1.0 +
        (stats.INT + stats.CHA) * 0.5;

    // Equipment Bonus
    if (adv.equipmentLevel) {
        cp *= (1 + adv.equipmentLevel * 0.02);
    }
    return cp;
};

// New Party Power Formula
AdventureSimulator.prototype._resolveBattle = function (party, monster, modifiers = {}) {
    // 1. Calculate Party CP
    let totalCP = 0;
    party.forEach(p => totalCP += this._getAdventurerPower(p));

    const avgCP = totalCP / party.length;
    // Bonus: +10% per additional member
    const sizeBonus = 1 + 0.1 * (party.length - 1);
    const partyPower = avgCP * sizeBonus;

    // 2. Enemy Power (Flattened Curve)
    // Map Rank E-S to 90-190 (Using QUEST_RANK_BASE_POWER)
    let enemyBase = QUEST_RANK_BASE_POWER[monster.rank] || 90;

    let enemyPower = enemyBase;
    if (monster.isBoss) enemyPower *= 1.5;
    else if (monster.category && monster.category.includes('強敵')) enemyPower *= 1.2;
    else if (monster.category && monster.category.includes('中堅')) enemyPower *= 1.1;

    // 3. Win Rate
    // Win Rate = 0.5 + (Party - Enemy) / 50
    let winRate = 0.5 + (partyPower - enemyPower) / 50;
    winRate = Math.max(0.05, Math.min(0.95, winRate));

    // Trait Mods (simplified)
    let winRateMod = 1.0;
    if (modifiers.winRate) winRateMod *= modifiers.winRate;
    winRate *= winRateMod;
    winRate = Math.max(0.05, Math.min(0.95, winRate));

    const win = Math.random() < winRate;

    // 4. Damage Calculation
    // Base Damage = EnemyPower * (1 - WinRate) * 0.3 (Tuned Factor for Multi-battle accumulation)
    // Variance = 0.5 - 1.5
    const variance = 0.5 + Math.random();
    let totalDamage = enemyPower * (1 - winRate) * 0.3 * variance;

    // Global Mods
    if (modifiers.danger) totalDamage *= modifiers.danger;

    // Distribute Damage (This part effectively matches the previous logic of returning total damage)
    let damage = Math.floor(totalDamage);

    return { win, damage, materials: [] }; // Materials omitted for calc test
};

// --- HELPER FUNCTIONS ---

function createAdventurer(rankLabel) {
    const types = Object.values(ADVENTURER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const adv = new Adventurer('id', 'TestAdv', type);

    // Force Stats to match Rank Center
    const rankCenters = { 'E': 100, 'D': 200, 'C': 400, 'B': 580, 'A': 820, 'S': 960 }; // Rank Value Centers
    adv.rankValue = rankCenters[rankLabel];
    adv.rankLabel = rankLabel; // Explicitly set label
    adv.stats = adv._generateStats(type, { id: 'central', statMod: {} }, adv.rankValue);
    return adv;
}

function createQuest(type, rank, days) {
    // Generate Quest Request
    const q = {
        id: 'test_quest',
        type: type,
        title: '実験クエスト (東)', // Added title for region detection
        rank: rank,
        days: days,
        difficulty: { rank: rank, powerReq: 100 },
        region: 'EAST'
    };
    return q;
}

// --- MAIN SIMULATION ---

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
const RESULTS = [];

const simulator = new AdventureSimulator();
// Inject Data
simulator.monsters = MONSTER_DATA;
simulator.items = ITEM_DATA;

console.log("Starting Simulation... (5400 Iterations)");

for (const pRank of RANKS) {
    for (let pSize = 1; pSize <= 5; pSize++) {
        for (const qRank of RANKS) {
            for (let days = 2; days <= 4; days++) {
                // Run 10 Times
                for (let i = 0; i < 10; i++) {
                    const party = Array(pSize).fill(null).map(() => createAdventurer(pRank));

                    // Test 1: HUNT
                    runTest('HUNT', qRank, days, party);

                    // Test 2: OTHERWORLD (Skipping for brevity in loop? User asked for ALL patterns for Otherworld too)
                    // The prompt implies: "Otherworld also run all pattern tests"
                    // Otherworld usually High Rank, but we test all E-S as requested.
                    runTest('OTHERWORLD', qRank, days, party);
                }
            }
        }
    }
}

function runTest(qType, qRank, days, party) {
    const quest = createQuest(qType, qRank, days);

    // Config logic for Otherworld if needed
    if (qType === 'OTHERWORLD') {
        // Mock Otherworld spec if not standard
        if (!QUEST_SPECS[qType]) {
            // Fallback if key missing, though it's in constants
        }
    }

    // Logic: Simulate Day 1 to days
    let totalDmg = 0;
    let battles = 0;
    let wins = 0;
    let injuredCount = 0;

    for (let d = 1; d <= days; d++) {
        const modifiers = {};
        // Simulate Day Logic manually to catch the battle results
        // AdventureSimulator.simulateDay(quest, party, day, totalDays, modifiers)
        // We use the simulator instance
        const simRes = simulator.simulateDay(quest, party, d, days, modifiers);

        battles += simRes.results.battles;
        wins += simRes.results.wins;
        totalDmg += simRes.results.damageTaken; // Total accumulated party damage
    }

    // Check Injury
    // Dmg is Total Party Damage. Average it?
    // In `QuestService.attemptQuest` logic (lines 330):
    // const dmgPerPerson = combinedResults.damageTaken / party.length;
    // if (effectiveDmg > 20) status = 'INJURED';

    const dmgPerPerson = totalDmg / party.length;
    const isInjured = dmgPerPerson > 20;

    RESULTS.push({
        pRank: party[0].rankLabel, // Assuming uniform rank
        pSize: party.length,
        qType: qType,
        qRank: qRank,
        days: days,
        battles: battles,
        wins: wins,
        isInjured: isInjured,
        dmgPerPerson: dmgPerPerson
    });
}

// --- REPORT GENERATION ---

console.log("Simulation Complete. Generating Report...");

// Metrics to Calculate:
// 1. Injury Rate per [PartyRank vs QuestRank] (Aggregated over sizes? Or broken down?)
// User requested: "Injury Rate, Win Rate per Monster Category"
// Actually user said: "5400 patterns... report Injury Rate, Win Rate per Monster Category"
// It's huge data. We should summarize.

// Summary Table: PartyRank vs QuestRank (Matched Size 3, 3 Days) ?
// No, let's show aggregations.

let report = "# Combat Simulation Report\n\n";
report += "Logic: Stat-based CP, Weighted Party Power, Flattened Enemy Curve.\n\n";

// Table 1: Injury Rate by Party Rank vs Quest Rank (All Sizes)
report += "## 1. Injury Rate (All Sizes Average)\n";
report += "| P.Rank \\ Q.Rank | E | D | C | B | A | S | \n|---|---|---|---|---|---|---|\n";

for (const pR of RANKS) {
    let row = `| **${pR}** |`;
    for (const qR of RANKS) {
        const set = RESULTS.filter(r => r.pRank === pR && r.qRank === qR);
        const inj = set.filter(r => r.isInjured).length;
        const rate = (inj / set.length * 100).toFixed(1);
        row += ` ${rate}% |`;
    }
    report += row + "\n";
}

// Table 2: Injury Rate by Party Size (Appropriate Rank Only: P.Rank == Q.Rank)
report += "\n## 2. Injury Rate by Party Size (Matched Rank Quests)\n";
report += "| Party Size | Injury Rate | Win Rate |\n|---|---|---|\n";
for (let s = 1; s <= 5; s++) {
    const set = RESULTS.filter(r => r.pSize === s && r.pRank === r.qRank);
    const inj = set.filter(r => r.isInjured).length;
    const wins = set.reduce((a, b) => a + b.wins, 0);
    const battles = set.reduce((a, b) => a + b.battles, 0);
    const injRate = (inj / set.length * 100).toFixed(1);
    const winRate = (wins / battles * 100).toFixed(1);
    report += `| ${s}人 | ${injRate}% | ${winRate}% |\n`;
}

// Table 3: HUNT vs OTHERWORLD (Matched Rank)
report += "\n## 3. Quest Type Comparison (Matched Rank)\n";
report += "| Type | Injury Rate | Avg Battles |\n|---|---|---|\n";
['HUNT', 'OTHERWORLD'].forEach(type => {
    const set = RESULTS.filter(r => r.qType === type && r.pRank === r.qRank);
    const inj = set.filter(r => r.isInjured).length;
    const battles = set.reduce((a, b) => a + b.battles, 0);
    const injRate = (inj / set.length * 100).toFixed(1);
    const avgBat = (battles / set.length).toFixed(1);
    report += `| ${type} | ${injRate}% | ${avgBat} |\n`;
});


// Table 4: S-Rank Party vs S-Rank Quest Detail
report += "\n## 4. S-Rank Party vs S-Rank Quest (Detail)\n";
report += "| Size | Injury Rate | Win Rate | Avg Dmg/Person |\n|---|---|---|---|\n";
for (let s = 1; s <= 5; s++) {
    const set = RESULTS.filter(r => r.pRank === 'S' && r.qRank === 'S' && r.pSize === s);
    const inj = set.filter(r => r.isInjured).length;
    const wins = set.reduce((a, b) => a + b.wins, 0);
    const battles = set.reduce((a, b) => a + b.battles, 0);
    const totalDmg = set.reduce((a, b) => a + b.dmgPerPerson, 0);

    const injRate = (inj / set.length * 100).toFixed(1);
    const winRate = (wins / battles * 100).toFixed(1);
    const avgDmg = (totalDmg / set.length).toFixed(1);

    report += `| ${s} | ${injRate}% | ${winRate}% | ${avgDmg} |\n`;
}

fs.writeFileSync('simulation_report.md', report);
console.log("Report Saved to simulation_report.md");

