import { MonsterDataLoader } from '../data/MonsterDataLoader.js';
import { ItemDataLoader } from '../data/ItemDataLoader.js';
import { QUEST_SPECS } from '../data/QuestSpecs.js';
import { TRAITS } from '../data/constants.js';
import { ADVENTURE_LOG_DATA } from '../data/AdventureLogData.js';
import { NORMAL_ACTION_LOGS } from '../data/ArtsData.js';

export class AdventureSimulator {
    constructor() {
        this.monsterLoader = new MonsterDataLoader();
        this.itemLoader = new ItemDataLoader();
        this.monsters = {};
        this.items = {};
    }

    /**
     * Initialize data
     */
    init(monsterData, itemData) {
        // If data is already an object, use it directly (Legacy MD parsing support kept just in case)
        if (typeof monsterData === 'object' && monsterData !== null) {
            this.monsters = monsterData;
        } else {
            this.monsters = this.monsterLoader.parse(monsterData);
        }

        if (typeof itemData === 'object' && itemData !== null) {
            this.items = itemData;
        } else {
            this.items = this.itemLoader.parse(itemData);
        }
    }

    /**
     * Simulate a single day of a quest
     */
    simulateDay(quest, party, dayIndex, totalDays, modifiers = {}) {
        const spec = QUEST_SPECS[quest.type] || {};
        const logs = [];
        const results = {
            battles: 0,
            wins: 0,
            damageTaken: 0,
            itemsFound: [],
            monstersKilled: []
        };

        const region = this._detectRegion(quest.title) || 'EAST';

        // 1. Intro Log (Only Day 1)
        if (dayIndex === 1) {
            // Use Quest Target if available
            const context = { area: this._getRegionName(region), target: quest.target || '未知の脅威' };

            // Generate Intro using QUEST_LOGS (Type Specific)
            const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[quest.type];
            let introTemplates = [];

            if (questLogData && questLogData.intro) {
                introTemplates = questLogData.intro;
            } else {
                // Fallback: This shouldn't happen if all types are covered
                introTemplates = ["一行は《{area}》へと向かった。"];
            }

            const intro = this._pick(introTemplates);
            logs.push(this._format(intro, context));

            const envIntro = this._pick(ADVENTURE_LOG_DATA.ENVIRONMENT[region]?.intro);
            if (envIntro) logs.push(envIntro);
        } else {
            // Daily Environment Log
            const envMid = this._pick(ADVENTURE_LOG_DATA.ENVIRONMENT[region]?.mid);
            if (envMid) logs.push(envMid);
        }

        // --- Calculate Modifiers ---
        let battleRateMod = 1.0;
        let gatherRateMod = 1.0;

        // Global Mods
        if (modifiers.danger) battleRateMod *= modifiers.danger;
        if (modifiers.dropRate) gatherRateMod *= modifiers.dropRate;

        const partyTraits = [];
        party.forEach(adv => {
            if (adv.traits) partyTraits.push(...adv.traits);
            (adv.traits || []).forEach(tKey => {
                const hook = TRAITS[tKey]?.hooks;
                if (hook) {
                    if (hook.battleRate) battleRateMod *= hook.battleRate;
                    if (hook.gatherRate) gatherRateMod *= hook.gatherRate;
                }
            });
        });

        // 2. Trait Flavor Log (Random chance per day)
        if (Math.random() < 0.4) {
            const randomTrait = this._pick(partyTraits);
            if (randomTrait && ADVENTURE_LOG_DATA.TRAITS[randomTrait]) {
                const owner = party.find(p => p.traits.includes(randomTrait));
                if (owner) {
                    const text = this._pick(ADVENTURE_LOG_DATA.TRAITS[randomTrait]);
                    logs.push(this._format(text, { name: owner.name }));
                }
            }
        }

        // 3. Random Events (15% Base)
        if (Math.random() < 0.15) {
            this._processRandomEvent(logs, results, party);
        }

        // 4. Main Activity Loops
        let battleCount = this._resolveRate(spec.rates?.battle);
        battleCount = this._applyProbabilisticMod(battleCount, battleRateMod);

        let gatherCount = this._resolveRate(spec.rates?.gather);
        gatherCount = this._applyProbabilisticMod(gatherCount, gatherRateMod);

        // Boss Logic
        let isBossDay = false;
        if (spec.bossDays?.includes('LAST') && dayIndex === totalDays) {
            isBossDay = true;
            battleCount = Math.max(battleCount, 1);
        }
        if (spec.bossModifier && Math.random() < spec.bossModifier) {
            isBossDay = true;
            battleCount = Math.max(battleCount, 1);
        }

        // Process Battles
        for (let i = 0; i < battleCount; i++) {
            const isBossBattle = isBossDay && (i === battleCount - 1);

            // --- CLIMAX LOG (Specific to Boss Battle) ---
            if (isBossBattle) {
                const questLogData = ADVENTURE_LOG_DATA.QUEST_LOGS[quest.type];
                if (questLogData && questLogData.climax && questLogData.climax.length > 0) {
                    const climaxText = this._pick(questLogData.climax);
                    if (climaxText) {
                        const ctx = {
                            area: this._getRegionName(region) || "現地",
                            target: quest.target || "ターゲット",
                            boss: quest.bossTarget || "敵の親玉"
                        };
                        logs.push(`[展開] ${this._format(climaxText, ctx)}`);
                    }
                }
            }

            const targetOverride = isBossBattle ? (quest.bossTarget || quest.target) : null;
            const encounter = this._generateEncounter(quest, isBossBattle, region, targetOverride);

            // --- ENCOUNTER LOG ---
            // Show discovery log before result
            const context = { monster: encounter.name, area: this._getRegionName(region) };
            logs.push(this._generateLog('ENCOUNTER', null, context));

            const battleResult = this._resolveBattle(party, encounter, modifiers, logs);

            results.battles++;

            if (battleResult.win) {
                results.wins++;
                results.monstersKilled.push(encounter);
                logs.push(this._generateLog('BATTLE_WIN', null, context));

                if (battleResult.materials && battleResult.materials.length > 0) {
                    results.itemsFound.push(...battleResult.materials);
                    // Optional: Log material drop? "素材を手に入れた！"
                    // logs.push(`[戦利品] ${battleResult.materials.map(m => m.name).join('、')}を入手した。`);
                }
            } else {
                logs.push(this._generateLog('BATTLE_LOSE', null, context));
            }
            results.damageTaken += battleResult.damage;
        }

        // Process Gathering
        for (let i = 0; i < gatherCount; i++) {
            const item = this._generateItem(quest, region);
            if (item) {
                results.itemsFound.push(item);
                logs.push(this._generateLog('GATHER_SUCCESS', null, { item: item.name, area: this._getRegionName(region) }));
            }
        }

        // 5. Filler Logs (Quiet Day Check)
        if (logs.length <= 1 && dayIndex > 1) {
            const filler = this._pick(ADVENTURE_LOG_DATA.FILLER);
            if (filler) logs.push(`[日常] ${filler}`);
        }

        return { results, logs };
    }

    _pick(array) {
        if (!array || array.length === 0) return null;
        return array[Math.floor(Math.random() * array.length)];
    }

    _format(template, context) {
        let text = template;
        for (const [key, val] of Object.entries(context)) {
            text = text.replace(new RegExp(`{${key}}`, 'g'), val);
            text = text.replace(new RegExp(`{{${key}}}`, 'g'), val);
        }
        return text;
    }

    // Updated to remove INTRO branch as it is handled in simulateDay via QUEST_LOGS
    _generateLog(category, subType, context, quest) {
        let templates = [];
        if (category === 'BATTLE_WIN') {
            templates = ADVENTURE_LOG_DATA.BATTLE_WIN;
        } else if (category === 'BATTLE_LOSE') {
            templates = ADVENTURE_LOG_DATA.BATTLE_LOSE;
        } else if (category === 'GATHER_SUCCESS') {
            templates = ADVENTURE_LOG_DATA.GATHER_SUCCESS;
        } else if (category === 'ENCOUNTER') {
            templates = ADVENTURE_LOG_DATA.ENCOUNTER;
        }

        const template = this._pick(templates) || "......";
        return this._format(template, context);
    }

    _processRandomEvent(logs, results, party) {
        const event = this._pick(ADVENTURE_LOG_DATA.EVENTS);
        logs.push(`[Event] ${event.text}`);
        if (event.effect === 'HP_DRAIN') {
            results.damageTaken += 10;
        }
    }

    _detectRegion(title) {
        if (title.includes('東')) return 'EAST';
        if (title.includes('北')) return 'NORTH';
        if (title.includes('南')) return 'SOUTH';
        if (title.includes('西')) return 'WEST';
        if (title.includes('中央')) return 'CENTRAL';
        return 'EAST';
    }

    _getRegionName(code) {
        const map = { EAST: '東の森', NORTH: '北の雪原', SOUTH: '南の砂漠', WEST: '西の沼地', CENTRAL: '中央平原' };
        return map[code] || '未知の土地';
    }

    _resolveRate(rate) {
        if (typeof rate === 'number') return rate;
        let min = 0, max = 0;
        if (typeof rate === 'number') {
            min = rate; max = rate;
        } else if (rate && typeof rate === 'object') {
            min = rate.min; max = rate.max;
        } else {
            return 0;
        }
        const val = min + Math.random() * (max - min);
        return val;
    }

    _applyProbabilisticMod(baseCount, mod) {
        const floatVal = baseCount * mod;
        const intVal = Math.floor(floatVal);
        if (Math.random() < (floatVal - intVal)) {
            return intVal + 1;
        }
        return intVal;
    }

    _generateEncounter(quest, isBoss, region, targetOverride) { // Added targetOverride check
        const rank = quest.difficulty.rank;

        // 1. Primary Search: Correct Region & Rank
        let candidates = this.monsters[region]?.[rank] || [];

        // 2. Secondary Search: East Region & Rank (Legacy Fallback)
        if (candidates.length === 0) {
            candidates = this.monsters['EAST']?.[rank] || [];
        }

        // 3. Fallback: Any Rank in Current Region
        if (candidates.length === 0 && this.monsters[region]) {
            Object.values(this.monsters[region]).forEach(list => candidates.push(...list));
        }

        // 4. Ultimate Fallback: Any Monster in Game
        if (candidates.length === 0) {
            Object.values(this.monsters).forEach(ranks => {
                Object.values(ranks).forEach(list => candidates.push(...list));
            });
        }

        // 5. Last Resort
        if (candidates.length === 0) {
            return { name: '謎の影', rank: 'E', mainType: 'unknown', power: 100 };
        }

        // --- Selection (Candidates Found) ---
        // Note: We need to filter by Boss/Non-Boss if able, but prioritize having *something* over "Mystery Shadow"
        const SAFE_LIST = candidates; // Use our found list

        // Use 'candidates' variable for the next block, renaming SAFE_LIST usage
        // But wait, the existing code uses SAFE_LIST then filters into 'candidates'.
        // Let's reuse the variable name `candidates` properly in the next steps or map SAFE_LIST to it.
        // Actually, let's redefine SAFE_LIST to be our robust candidates list for minimal diff downstream.
        const ROBUST_LIST = candidates;

        // Reset candidates for determining Boss/Non-Boss specific
        candidates = []; // Clear for filtering steps

        // Filter by Boss / Non-Boss
        if (isBoss) {
            candidates = ROBUST_LIST.filter(m => m.category.includes('ボス'));
            if (candidates.length === 0) candidates = ROBUST_LIST;
        } else {
            candidates = ROBUST_LIST.filter(m => !m.category.includes('ボス'));
            if (candidates.length === 0) candidates = ROBUST_LIST;
        }

        let monster = candidates[Math.floor(Math.random() * candidates.length)];

        // Target Override for Boss
        if (isBoss && targetOverride) {
            // Check if target name exists in the list? 
            // Or just create a monster with that name.
            // Search list first
            const found = SAFE_LIST.find(m => m.name === targetOverride);
            if (found) monster = found;
            else {
                // If not found in current rank list (maybe selected from different rank?), just use name
                monster = { ...monster, name: targetOverride };
            }
        }

        // New Power Curve (Flattened)
        const rankMap = { 'E': 90, 'D': 110, 'C': 130, 'B': 150, 'A': 170, 'S': 190 };
        const powerBase = rankMap[rank] || 90;
        let power = powerBase;

        if (isBoss) {
            power *= 1.5;
            return { ...monster, name: monster.name, power, isBoss: true };
        } else {
            if (monster.category && monster.category.includes('強敵')) power *= 1.2;
            else if (monster.category && monster.category.includes('中堅')) power *= 1.1;
            return { ...monster, power, isBoss: false };
        }
    }

    _generateItem(quest, region) {
        const rank = quest.difficulty.rank;
        const list = this.items[region]?.[rank] || [];
        const SAFE_LIST = list.length > 0 ? list : (this.items['EAST']?.[rank] || []);

        if (SAFE_LIST.length === 0) return null;
        return SAFE_LIST[Math.floor(Math.random() * SAFE_LIST.length)];
    }

    _getAdventurerPower(adv) {
        const stats = adv.stats || {};
        // CP = (STR + VIT + DEX + MAG) * 1.0 + (INT + CHA) * 0.5
        let cp = ((stats.STR || 0) + (stats.VIT || 0) + (stats.DEX || 0) + (stats.MAG || 0)) * 1.0 +
            ((stats.INT || 0) + (stats.CHA || 0)) * 0.5;

        // Equipment Bonus (Real Items: 2% per Rank Point)
        if (adv.equipment && adv.equipment.length > 0) {
            const RANK_VAL = { 'E': 1, 'D': 2, 'C': 3, 'B': 4, 'A': 5, 'S': 6 };
            let totalRank = 0;
            adv.equipment.forEach(e => {
                totalRank += (RANK_VAL[e.rank] || 1);
            });
            cp *= (1 + totalRank * 0.02);
        } else if (adv.equipmentLevel) {
            // Fallback
            cp *= (1 + adv.equipmentLevel * 0.02);
        }

        // Arts Bonus (1 Art = C Rank Equip = +6%)
        if (adv.arts && adv.arts.length > 0) {
            cp *= (1 + adv.arts.length * 0.06);
        }

        return cp;
    }

    _resolveBattle(party, monster, modifiers = {}, logs = []) {
        // --- Action Logs ---
        party.forEach(adv => {
            let template = '';
            // 30% Art Chance
            if (adv.arts && adv.arts.length > 0 && Math.random() < 0.3) {
                const art = adv.arts[Math.floor(Math.random() * adv.arts.length)];
                if (art.logs && art.logs.length > 0) {
                    template = art.logs[Math.floor(Math.random() * art.logs.length)];
                }
            }

            // Normal Action
            if (!template) {
                const normalLogs = NORMAL_ACTION_LOGS[adv.type] || ['{name}は果敢に戦った！'];
                template = normalLogs[Math.floor(Math.random() * normalLogs.length)];
            }

            if (logs) logs.push(template.replace(/{name}/g, adv.name));
        });

        // 1. Calculate Party CP
        let totalCP = 0;
        party.forEach(p => totalCP += this._getAdventurerPower(p));

        const avgCP = totalCP / party.length;
        // Bonus: +10% per additional member (3 members = 1.2x)
        const sizeBonus = 1 + 0.1 * (party.length - 1);
        const partyPower = avgCP * sizeBonus;

        // 2. Enemy Power (Flattened Curve)
        // E:90, D:110, C:130, B:150, A:170, S:190
        const rankMap = { 'E': 90, 'D': 110, 'C': 130, 'B': 150, 'A': 170, 'S': 190 };
        let enemyBase = rankMap[monster.rank] || 90;

        let enemyPower = enemyBase;
        if (monster.isBoss) enemyPower *= 1.5;
        else if (monster.category && monster.category.includes('強敵')) enemyPower *= 1.2;
        else if (monster.category && monster.category.includes('中堅')) enemyPower *= 1.1;

        // 3. Win Rate
        // Win Rate = 0.5 + (Party - Enemy) / 50
        // Cap at 5% - 95%
        const baseWinRate = 0.5 + (partyPower - enemyPower) / 50;
        let winRate = Math.max(0.05, Math.min(0.95, baseWinRate));

        // Trait Mods
        party.forEach(p => {
            (p.traits || []).forEach(tKey => {
                const h = TRAITS[tKey]?.hooks;
                if (h && h.winRate) winRate *= h.winRate;
                if (h && h.magicWinRate && p.type === 'MAGE') winRate *= h.magicWinRate;
            });
        });
        if (modifiers.winRate) winRate *= modifiers.winRate;

        // Soft Cap again after mods
        winRate = Math.max(0.05, Math.min(0.95, winRate));

        const win = Math.random() < winRate;

        // 4. Damage Calculation
        // Base Damage = EnemyPower * (1 - WinRate) * 0.3 (Tuned Factor)
        // Variance = 0.5 - 1.5
        const variance = 0.5 + Math.random();
        let totalDamage = enemyPower * (1 - winRate) * 0.3 * variance;

        // Global Danger/Injury Mods
        if (modifiers.danger) totalDamage *= modifiers.danger;
        if (modifiers.injury) totalDamage *= modifiers.injury;

        let damage = Math.floor(totalDamage);

        let materials = [];
        if (win) {
            const mat = this._generateMonsterMaterial(monster);
            if (mat) materials.push(mat);
        }

        return { win, damage, materials };
    }

    _generateMonsterMaterial(monster) {
        const type = monster.mainType || 'unknown';
        const isBoss = monster.isBoss || false;

        // Priority mapping based on Rule 8
        const mapping = {
            'beast': ['皮', '牙', '骨', '毛皮'],
            'humanoid': ['骨', '血液', '心臓'],
            'slime': ['核', '凝縮体', '粘核'],
            'plant': ['樹芯', '樹液', '霊芽'],
            'fungus': ['菌核', '胞子核'],
            'insect': ['甲殻', '翅膜', '毒嚢'],
            'sea': ['鱗', '潮核', '真珠', '骨'],
            'dragon': ['鱗', '角', '竜核', '心臓'],
            'undead': ['魂片', '呪骨', '死灰'],
            'spirit': ['霊核', '残滓', '権能片'],
            'elemental': ['属性核'],
            'construct': ['鉱核', '魔導核', '結晶核'],
            'god': ['神核', '神血', '権能片']
        };

        const candidates = mapping[type] || ['謎の素材', '体液'];
        const materialName = candidates[Math.floor(Math.random() * candidates.length)];

        // Value Calculation
        // E:20 -> S:???
        const rankValues = { 'E': 20, 'D': 50, 'C': 100, 'B': 200, 'A': 300, 'S': 500 };
        let baseValue = rankValues[monster.rank] || 20;
        if (isBoss) baseValue *= 3; // Boss materials are valuable

        return {
            name: `${monster.name}の${materialName}`,
            value: baseValue,
            isMaterial: true
        };
    }
}
