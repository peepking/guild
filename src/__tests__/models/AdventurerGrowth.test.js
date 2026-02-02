import { describe, it, expect, beforeEach } from 'vitest';
import { Adventurer } from '../../models/Adventurer.js';
import { ADVENTURER_TYPES } from '../../data/constants.js';

describe('Adventurer Growth', () => {
    let adventurer;

    beforeEach(() => {
        adventurer = new Adventurer('a1', 'TestAdv', ADVENTURER_TYPES.WARRIOR);
        adventurer.rankValue = 0;
        adventurer.arts = [];
    });

    it('should NOT learn art below Rank B (380)', () => {
        adventurer.updateRank(379); // 0 -> 379
        expect(adventurer.arts.length).toBe(0);
        expect(adventurer.rankValue).toBe(379);
    });

    it('should learn 1st art at Rank B (380)', () => {
        adventurer.updateRank(380); // 0 -> 380
        expect(adventurer.arts.length).toBe(1);
    });

    it('should NOT learn 2nd art between 380 and 1000', () => {
        adventurer.updateRank(380); // 0 -> 380, learns 1st
        expect(adventurer.arts.length).toBe(1);

        adventurer.updateRank(619); // 380 -> 999
        expect(adventurer.rankValue).toBe(999);
        expect(adventurer.arts.length).toBe(1);
    });

    it('should learn 2nd art at Rank S (1000)', () => {
        adventurer.rankValue = 999;
        adventurer.arts = [{ id: 'art1' }]; // Assume 1st learned

        adventurer.updateRank(1); // 999 -> 1000
        expect(adventurer.arts.length).toBe(2);
    });

    it('should update rank label correctly', () => {
        adventurer.rankValue = 0;
        adventurer.updateRank(0);
        expect(adventurer.rankLabel).toBe('E');

        adventurer.updateRank(80); // D
        expect(adventurer.rankLabel).toBe('D');

        adventurer.updateRank(120); // 200 total -> C
        expect(adventurer.rankLabel).toBe('C');
    });
});
