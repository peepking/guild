import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdventureSimulator } from '../../services/AdventureSimulator.js';

describe('AdventureSimulator', () => {
    let simulator;

    beforeEach(() => {
        simulator = new AdventureSimulator();
    });

    it('should resolve variable rates correctly', () => {
        // Rate: {min, max} -> variable
        // Logic: _resolveRate

        // Access private method helper or test via public?
        // simulateDay calls it.
        // Let's test _resolveRate directly if accessible (it is in JS).

        const val = simulator._resolveRate({ min: 2, max: 4 });
        expect(val).toBeGreaterThanOrEqual(2);
        expect(val).toBeLessThanOrEqual(4);

        const fixed = simulator._resolveRate(5);
        expect(fixed).toBe(5);
    });

    it('should apply probabilistic modifiers', () => {
        // _applyProbabilisticMod(count, mod)
        // count 10, mod 1.5 -> 15
        const res = simulator._applyProbabilisticMod(10, 1.5);
        // It's probabilistic for decimals, but 10*1.5=15 is integer.
        // If 1.1 -> 11.
        expect(res).toBe(15);

        // 10 * 0.5 = 5
        expect(simulator._applyProbabilisticMod(10, 0.5)).toBe(5);
    });

    it('should simulate a day with battles', () => {
        const quest = {
            id: 'q1',
            type: 'HUNT',
            title: 'Goblin Hunt',
            difficulty: { rank: 'E', powerReq: 10 },
            target: 'Goblin'
        };
        const party = [{
            name: 'P1',
            rankValue: 100,
            stats: { STR: 10 },
            equipmentLevel: 1,
            traits: []
        }];

        // We need QUEST_SPECS for 'HUNT' to create battles.
        // Simulator imports QUEST_SPECS.
        // If definitions are missing, rates might be undefined.
        // Assuming 'HUNT' exists in constants.

        const result = simulator.simulateDay(quest, party, 1, 1);

        expect(result).toBeDefined();
        expect(result.logs).toBeInstanceOf(Array);
        expect(result.results.battles).toBeGreaterThanOrEqual(0);
    });
});
