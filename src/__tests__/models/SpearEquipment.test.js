import { describe, it, expect } from 'vitest';
import { Adventurer } from '../../models/Adventurer.js';

describe('Spear Equipment Implementation', () => {
    it('should be able to accept SPEAR as a weapon', () => {
        // Create a dummy adventurer
        const adventurer = new Adventurer('test-id', 'Test Knight', 'KNIGHT');

        // Define a Spear item
        const spearItem = {
            name: 'Test Spear',
            type: 'SPEAR',
            rank: 'E'
        };

        // Add equipment
        adventurer.addEquipment(spearItem);

        // Verify it was added
        expect(adventurer.equipment.length).toBe(1);
        expect(adventurer.equipment[0]).toEqual(spearItem);
    });

    it('should correctly replace existing weapon with SPEAR', () => {
        const adventurer = new Adventurer('test-id', 'Test Warrior', 'WARRIOR');

        // Add a sword first
        adventurer.addEquipment({ name: 'Old Sword', type: 'LONG_SWORD', rank: 'E' });
        expect(adventurer.equipment.length).toBe(1);
        expect(adventurer.equipment[0].type).toBe('LONG_SWORD');

        // Add a spear
        adventurer.addEquipment({ name: 'New Spear', type: 'SPEAR', rank: 'E' });

        // Verify replacement (Should still be 1 item, and it's the spear)
        expect(adventurer.equipment.length).toBe(1);
        expect(adventurer.equipment[0].type).toBe('SPEAR');
        expect(adventurer.equipment[0].name).toBe('New Spear');
    });

    it('should not replace armor when adding a spear', () => {
        const adventurer = new Adventurer('test-id', 'Test Paladin', 'PALADIN');

        // Add armor
        adventurer.addEquipment({ name: 'Heavy Armor', type: 'HEAVY', rank: 'E' });

        // Add spear
        adventurer.addEquipment({ name: 'Holy Spear', type: 'SPEAR', rank: 'E' });

        // Verify both exist
        expect(adventurer.equipment.length).toBe(2);
        const types = adventurer.equipment.map(e => e.type);
        expect(types).toContain('HEAVY');
        expect(types).toContain('SPEAR');
    });
});
