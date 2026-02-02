
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../services/StorageService.js';
import { GameLoop } from '../../core/GameLoop.js';
import { Guild } from '../../models/Guild.js';
import { Adventurer } from '../../models/Adventurer.js';
import { Quest } from '../../models/Quest.js';
import { QuestAssignment } from '../../models/QuestAssignment.js';

// LocalStorage Mock
const localStorageMock = (function () {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; })
    };
})();

// Assign to global
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock
});

describe('StorageService', () => {
    let storageService;
    let mockGameLoop;
    let mockGuild;

    beforeEach(() => {
        // Reset mocks
        localStorage.clear();
        vi.clearAllMocks();

        storageService = new StorageService('test_storage_key');

        // Setup Guild with some data
        mockGuild = new Guild();
        mockGuild.money = 1000;
        mockGuild.day = 5;
        mockGuild.adventurers = [
            new Adventurer('adv1', 'Hero A', 'WARRIOR'),
            new Adventurer('adv2', 'Mage B', 'MAGE')
        ];
        // Ensure they have some specific state
        mockGuild.adventurers[0].rankValue = 150;

        // Setup GameLoop mock structure
        mockGameLoop = {
            guild: mockGuild,
            mailService: { mails: [], mailCounter: 0 },
            questService: { questCounter: 10 },
            activeQuests: [],
            ongoingQuests: [],
            plannedQuests: [],
            questHistory: [],
            uiManager: { log: vi.fn() } // partial mock
        };
    });

    it('should save game data to localStorage', () => {
        const result = storageService.save(mockGameLoop);

        expect(result).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('test_storage_key', expect.any(String));

        // Additional check on content
        const savedData = JSON.parse(localStorageMock.getItem('test_storage_key'));
        expect(savedData.version).toBe(1);
        expect(savedData.guild.money).toBe(1000);
        expect(savedData.guild.adventurers.length).toBe(2);
    });

    it('should load game data and rehydrate objects correctly', () => {
        // First save
        storageService.save(mockGameLoop);

        // Modify current state to verify loading works (e.g. clear adventurers)
        mockGameLoop.guild.adventurers = [];
        mockGameLoop.guild.money = 0;

        // Load
        const result = storageService.load(mockGameLoop);

        expect(result).toBe(true);
        expect(mockGameLoop.guild.money).toBe(1000);
        expect(mockGameLoop.guild.adventurers.length).toBe(2);

        // Check Object Rehydration (Instance types)
        expect(mockGameLoop.guild.adventurers[0]).toBeInstanceOf(Adventurer);
        expect(mockGameLoop.guild.adventurers[0].name).toBe('Hero A');
        expect(mockGameLoop.guild.adventurers[0].rankValue).toBe(150);
        // Check methods verify it's a real instance
        expect(typeof mockGameLoop.guild.adventurers[0].isAvailable).toBe('function');
    });

    it('should handle circular references in assignments (rehydration linking)', () => {
        const quest = new Quest('q1', 'Test Quest', 'HUNT', { powerReq: 100 });
        const adventurer = mockGameLoop.guild.adventurers[0];
        const assignment = new QuestAssignment(quest, [adventurer]);

        mockGameLoop.ongoingQuests.push(assignment);

        // Save
        storageService.save(mockGameLoop);

        // Clear state
        mockGameLoop.ongoingQuests = [];
        mockGameLoop.guild.adventurers = []; // Force re-creation

        // Load
        storageService.load(mockGameLoop);

        // Verify assignment restored
        expect(mockGameLoop.ongoingQuests.length).toBe(1);
        const loadedAssignment = mockGameLoop.ongoingQuests[0];
        expect(loadedAssignment).toBeInstanceOf(QuestAssignment);
        expect(loadedAssignment.quest.title).toBe('Test Quest');

        // Verify member linking
        // The adventurer in the assignment should be the SAME instance as in the guild list
        const loadedAdventurerInUtils = mockGameLoop.guild.adventurers[0];
        const loadedAdventurerInAssign = loadedAssignment.members[0];

        expect(loadedAdventurerInAssign).toBeDefined(); // loadedAdventurerInAssign
        expect(loadedAdventurerInUtils.id).toBe(loadedAssignment.members[0].id); // check IDs match

        // In current implementation of _deserialize -> restoreAssignment:
        // refer to: const found = guild.adventurers.find(a => a.id === mDatum.id);
        // So they should be the exact same object reference if it worked correctly.
        expect(loadedAdventurerInAssign).toBe(loadedAdventurerInUtils);
    });

    it('should export and import data via base64 string', () => {
        const exportString = storageService.exportData(mockGameLoop);
        expect(exportString).toEqual(expect.any(String));

        // Modify state
        mockGameLoop.guild.money = 999999;

        // Import
        const result = storageService.importData(exportString, mockGameLoop);
        expect(result).toBe(true);
        expect(mockGameLoop.guild.money).toBe(1000); // Restored
    });

    it('should handle missing data gracefully', () => {
        const result = storageService.load(mockGameLoop);
        expect(result).toBe(false); // No data saved yet
    });
});
