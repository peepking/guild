import { QuestService } from '../src/services/QuestService.js';
import { MonsterDataLoader } from '../src/data/MonsterDataLoader.js';
import { ItemDataLoader } from '../src/data/ItemDataLoader.js';
import { MONSTER_DATA } from '../src/data/monsterData.js';
import { ADVENTURE_LOG_DATA } from '../src/data/AdventureLogData.js';

// Mock Item Data since it is loaded from MD usually
const mockItemData = `
# 東街（森林）
## E
- 薬草
- 毒消し草
`.trim();

// Mock dependencies
const qs = new QuestService();
// Manually init simulator with data
qs.simulator.monsters = MONSTER_DATA;
qs.simulator.items = new ItemDataLoader().parse(mockItemData);

console.log("--- Generating DUNGEON Quests ---");
for (let i = 0; i < 5; i++) {
    // Force Random Quest until we get DUNGEON... difficult to force?
    // Let's modify _createRandomQuest to accept typeKey for testing? 
    // No, I can't easily modify the class just for test without editing file.
    // Instead I will just call generateDailyQuests many times and filter.
}

// Actually, I can just instantiate QuestService and call _createRandomQuest if I can access it.
// It is "private" (_) but JS allows access.
// But _createRandomQuest doesn't take type. 

// Let's overwrite `Math.random` to control flow? No, too messy.
// I'll just generate 100 quests and print any DUNGEON/RUINS and SPECIAL ones.

const quests = [];
for (let i = 0; i < 50; i++) {
    quests.push(...qs.generateDailyQuests(1, 100)); // efficient rep
}

console.log("\n[DUNGEON / RUINS Targets]");
quests.filter(q => q.type === 'DUNGEON' || q.type === 'RUINS').slice(0, 5).forEach(q => {
    console.log(`[${q.type}] Target: ${q.target} | Desc: ${q.description}`);
});

console.log("\n[SPECIAL Quests Targets & Logs]");
quests.filter(q => q.isSpecial).slice(0, 3).forEach(q => {
    console.log(`\n[${q.type}] Target: ${q.target}`);
    // Simulate query execution to see logs
    const result = qs.attemptQuest(q, []); // Empty party, just to check logs
    const lastDay = result.logs[result.logs.length - 1]; // Day 7
    if (lastDay) {
        lastDay.logs.forEach(l => {
            if (l.includes('[展開]') || l.includes('[状況]') || l.includes('[結末]')) {
                console.log(l);
            }
        });
    }
});
console.log("\n[Encounter & Material Verification]");
const encounters = { boss: 0, normal: 0 };
const materials = [];

// Create a HUNT quest to force battles
const huntQuest = qs._createRandomQuest(1);
huntQuest.type = 'HUNT';
huntQuest.difficulty.rank = 'C';
// Use explicit high battle rate stub to ensure battles
huntQuest.weights = { strength: 1 };

for (let i = 0; i < 20; i++) {
    // Manually call simulateDay to inspect internal results more easily
    const dayRes = qs.simulator.simulateDay(huntQuest, [{ name: 'TestAdv', rankValue: 500, type: 'WARRIOR', traits: [], stats: {}, equipmentLevel: 1, temperament: { risk: 1, greed: 1, social: 1 } }], 1, 1);

    dayRes.results.monstersKilled.forEach(m => {
        if (m.isBoss) encounters.boss++;
        else encounters.normal++;
    });

    if (dayRes.results.itemsFound.length > 0) {
        dayRes.results.itemsFound.forEach(item => {
            if (item.isMaterial) {
                materials.push(item);
            }
        });
    }
}

console.log(`\nEncounters: Normal=${encounters.normal}, Boss=${encounters.boss}`);
console.log(`Materials Dropped: ${materials.length}`);
if (materials.length > 0) {
    console.log("Sample Materials:");
    materials.slice(0, 3).forEach(m => console.log(`- ${m.name} (${m.value}G)`));
}
