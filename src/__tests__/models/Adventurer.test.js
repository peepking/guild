import { describe, it, expect } from 'vitest';
import { Adventurer } from '../../models/Adventurer.js';
import { ADVENTURER_TYPES } from '../../data/constants.js';

describe('Adventurer Model', () => {
    it('should initialize with correct default values', () => {
        const adv = new Adventurer(1, 'Hero', 'WARRIOR');

        expect(adv.id).toBe(1);
        expect(adv.name).toBe('Hero');
        expect(adv.type).toBe('WARRIOR');
        expect(adv.rankValue).toBeDefined();
        expect(adv.rankLabel).toBeDefined();

        expect(adv.stats).toBeDefined();
        // Check basic stats structure
        expect(adv.stats).toHaveProperty('STR');
        expect(adv.stats).toHaveProperty('VIT');
        expect(adv.stats).toHaveProperty('DEX');
        expect(adv.stats).toHaveProperty('MAG');
        expect(adv.stats).toHaveProperty('INT');
        expect(adv.stats).toHaveProperty('CHA');
    });

    it('should handle equipment upgrades', () => {
        const adv = new Adventurer(3, 'Fighter', 'WARRIOR');
        adv.personalMoney = 1000;

        expect(adv.equipmentLevel).toBe(0);
        const success = adv.upgradeEquipment(500);

        expect(success).toBe(true);
        expect(adv.equipmentLevel).toBe(1);
        expect(adv.personalMoney).toBe(500);
    });

    it('should handle equipment addition', () => {
        const adv = new Adventurer(4, 'Tank', 'WARRIOR');
        const sword = { type: 'LONG_SWORD', name: 'Iron Sword' };

        adv.addEquipment(sword);
        expect(adv.equipment.length).toBe(1);
        expect(adv.equipment[0]).toBe(sword);

        // Replace weapon
        const newSword = { type: 'AXE', name: 'Battle Axe' };
        adv.addEquipment(newSword);
        expect(adv.equipment.length).toBe(1);
        expect(adv.equipment[0]).toBe(newSword);
    });
});
