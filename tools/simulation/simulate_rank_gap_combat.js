
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock context for non-browser environment
global.window = {};

// Import necessary modules
import { CONSTANTS, ADVENTURER_TYPES, BASE_STATS, TRAITS, QUEST_RANK_BASE_POWER } from '../../src/data/constants.js';
import { MONSTER_DATA } from '../../src/data/monsterData.js';
import { ITEM_DATA } from '../../src/data/itemData.js';
import { QUEST_SPECS, REGIONS } from '../../src/data/QuestSpecs.js';
import { AdventureSimulator } from '../../src/services/AdventureSimulator.js';
import { Adventurer } from '../../src/models/Adventurer.js';

// --- 1. PATCH SIMULATOR WITH NEW LOGIC (COPIED FROM simulate_new_combat.js) ---

// New Adventurer CP Formula
AdventureSimulator.prototype._getAdventurerPower = function (adv) {
    const stats = adv.stats;
    // CP = (STR + VIT + DEX + MAG) * 1.0 + (INT + CHA) * 0.5
    let cp = ((stats.STR || 0) + (stats.VIT || 0) + (stats.DEX || 0) + (stats.MAG || 0)) * 1.0 +
        ((stats.INT || 0) + (stats.CHA || 0)) * 0.5;

    // Equipment Bonus
    if (adv.equipmentLevel) {
        cp *= (1 + adv.equipmentLevel * 0.02);
    }
    return cp;
};

// New Party Power Formula & Battle Resolution
AdventureSimulator.prototype._resolveBattle = function (party, monster, modifiers = {}) {
    // 1. Calculate Party CP
    let totalCP = 0;
    party.forEach(p => totalCP += this._getAdventurerPower(p));

    const avgCP = totalCP / party.length;
    // Bonus: +10% per additional member
    const sizeBonus = 1 + 0.1 * (party.length - 1);
    const partyPower = avgCP * sizeBonus;

    // 2. Enemy Power (Flattened Curve)
    // Map Rank E-S to 90-190
    let enemyBase = QUEST_RANK_BASE_POWER[monster.rank] || 90;

    let enemyPower = enemyBase;
    if (monster.isBoss) enemyPower *= 1.5;
    else if (monster.category && monster.category.includes('強敵')) enemyPower *= 1.2;
    else if (monster.category && monster.category.includes('中堅')) enemyPower *= 1.1;
    // 雑魚 is base (1.0)

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
    // Base Damage = EnemyPower * (1 - WinRate) * 0.3
    const variance = 0.5 + Math.random();
    let totalDamage = enemyPower * (1 - winRate) * 0.3 * variance;

    // Global Mods
    if (modifiers.danger) totalDamage *= modifiers.danger;

    let damage = Math.floor(totalDamage);

    return { win, damage, winRate }; // Returning winRate for debug
};

// --- HELPER FUNCTIONS ---

function createAdventurer(rankLabel) {
    const types = Object.values(ADVENTURER_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const adv = new Adventurer('id', 'TestAdv', type);

    // Force Stats to match Rank Center
    const rankCenters = { 'E': 100, 'D': 200, 'C': 400, 'B': 580, 'A': 820, 'S': 960 };
    adv.rankValue = rankCenters[rankLabel];
    adv.rankLabel = rankLabel;

    // Using internal _generateStats if available, else mocking it
    // Note: In real app, _generateStats is on prototype.
    if (adv._generateStats) {
        adv.stats = adv._generateStats(type, { id: 'central', statMod: {} }, adv.rankValue);
    } else {
        // Fallback or if import failed to attach prototype?
        // It should work if Adventurer is imported correctly.
        // Simplified fallback just in case:
        adv.stats = { STR: 10, VIT: 10, DEX: 10, MAG: 10, INT: 10, CHA: 10 };
    }

    // Simulate Equipment Level matching Rank?
    // User didn't specify, but usually E:1, D:5... S:50?
    // simulate_new_combat.js didn't set it. So we assume 0 equipment bonus or minimal.
    // We will stick to simulate_new_combat.js logic (no equipment explicitly set).
    adv.equipmentLevel = 0;

    return adv;
}

function createMonster(rank, categoryKey) {
    // categoryKey: 'ZAKO', 'CHUKEN', 'KYOUTEKI', 'BOSS'
    const m = {
        rank: rank,
        name: `TestMonster_${rank}_${categoryKey}`,
        category: [],
        isBoss: false
    };

    if (categoryKey === 'ZAKO') {
        m.category.push('雑魚');
    } else if (categoryKey === 'CHUKEN') {
        m.category.push('中堅');
    } else if (categoryKey === 'KYOUTEKI') {
        m.category.push('強敵');
    } else if (categoryKey === 'BOSS') {
        m.category.push('ボス');
        m.isBoss = true;
    }

    return m;
}

// --- MAIN SIMULATION ---

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S'];
const CATEGORIES = ['ZAKO', 'CHUKEN', 'KYOUTEKI', 'BOSS'];
const CAT_LABELS = { 'ZAKO': '雑魚', 'CHUKEN': '中堅', 'KYOUTEKI': '強敵', 'BOSS': 'ボス' };
const ITERATIONS = 100;

const simulator = new AdventureSimulator();
// Inject Data
simulator.monsters = MONSTER_DATA;
simulator.items = ITEM_DATA;

const OUTPUT_RESULTS = [];

console.log(`Starting Rank Gap Simulation... (${ITERATIONS} iterations per pair)`);

// Outer Loop: Attacker Rank (E to A, since S has no higher rank)
// User said: E vs D...S, D vs C...S, etc.
for (let i = 0; i < RANKS.length - 1; i++) {
    const atkRank = RANKS[i];

    // Inner Loop: Defender Rank (atkRank+1 ... S)
    for (let j = i + 1; j < RANKS.length; j++) {
        const defRank = RANKS[j];

        // Inner Loop 2: Category
        for (const cat of CATEGORIES) {

            let wins = 0;
            let sumWinRate = 0;

            for (let k = 0; k < ITERATIONS; k++) {
                // Solo Battle
                const party = [createAdventurer(atkRank)];
                const monster = createMonster(defRank, cat);

                const res = simulator._resolveBattle(party, monster);
                if (res.win) wins++;
                sumWinRate += res.winRate; // Track theoretical win rate too
            }

            const winRateActual = (wins / ITERATIONS * 100).toFixed(1);
            const winRateTheoretical = (sumWinRate / ITERATIONS * 100).toFixed(1);

            OUTPUT_RESULTS.push({
                atkRank,
                defRank,
                cat,
                wins,
                winRateActual,
                winRateTheoretical
            });

            // Console log progress occasionally
            // console.log(`${atkRank} vs ${defRank} (${cat}): ${wins}/${ITERATIONS}`);
        }
    }
}

// --- GENERATE MARKDOWN REPORT ---

let report = "# 戦闘シミュレーション結果: 格上挑戦 (Personal Match)\n\n";
report += `実行日時: ${new Date().toLocaleString()}\n`;
report += `条件: ソロ(1人)、各組み合わせ${ITERATIONS}戦\n\n`; // Conditions: Solo (1 person), 100 battles each combination

// Generate tables for each Attacker Rank
for (let i = 0; i < RANKS.length - 1; i++) {
    const currRank = RANKS[i];
    report += `## 攻撃側ランク: ${currRank}\n\n`;
    report += "| 相手ランク | カテゴリ | 勝率 (実測) | 勝率 (理論値) | 勝利数 |\n";
    report += "|---|---|---|---|---|\n";

    const subset = OUTPUT_RESULTS.filter(r => r.atkRank === currRank);

    // Sort by DefRank then Category precedence
    // Actually our generation order is already sorted, but filter keeps order.

    for (const res of subset) {
        report += `| ${res.defRank} | ${CAT_LABELS[res.cat]} | ${res.winRateActual}% | ${res.winRateTheoretical}% | ${res.wins}/${ITERATIONS} |\n`;
    }
    report += "\n";
}

fs.writeFileSync('rank_gap_simulation_report.md', report);
console.log("Report Saved to rank_gap_simulation_report.md");
