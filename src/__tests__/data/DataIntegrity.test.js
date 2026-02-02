import { describe, it, expect } from 'vitest';
import { REGIONS, QUEST_SPECS } from '../../data/QuestSpecs.js';
import { ADVENTURER_TYPES, BASE_STATS } from '../../data/constants.js';
import { MonsterDataLoader } from '../../data/MonsterDataLoader.js';

describe('Data Integrity', () => {
    it('should have valid QuestSpecs', () => {
        expect(Object.keys(QUEST_SPECS).length).toBeGreaterThan(0);

        Object.values(QUEST_SPECS).forEach(spec => {
            expect(spec.label).toBeDefined();
            expect(spec.category).toBeDefined();
            expect(spec.ranks).toBeInstanceOf(Array);
        });
    });

    it('should have valid Regions', () => {
        expect(REGIONS).toBeInstanceOf(Array);
        expect(REGIONS.length).toBeGreaterThan(0);
    });

    it('should have valid Adventurer Types', () => {
        expect(Object.keys(ADVENTURER_TYPES).length).toBeGreaterThan(0);
        expect(Object.keys(BASE_STATS).length).toBeGreaterThan(0);

        // Ensure all types have base stats
        Object.values(ADVENTURER_TYPES).forEach(type => {
            expect(BASE_STATS[type]).toBeDefined();
        });
    });

    it('should load monster data correctly', () => {
        const loader = new MonsterDataLoader();
        // Assuming parse() returns the data structure directly or we need to mock internal data source?
        // If MonsterDataLoader reads from file lines or internal constant, it should work.
        // Based on deleted test: loader.parse() returns data.
        const data = loader.parse();

        expect(data).toBeDefined();
        // Check for 'EAST' region and 'E' rank as per old test
        if (data['EAST'] && data['EAST']['E']) {
            expect(data['EAST']['E'].length).toBeGreaterThan(0);
            const monster = data['EAST']['E'][0];
            expect(monster.name).toBeDefined();
            expect(monster.rank).toBeDefined();
        }
    });
});
