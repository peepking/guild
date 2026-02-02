import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignmentService } from '../../services/AssignmentService.js';
import { Guild } from '../../models/Guild.js';
import { Adventurer } from '../../models/Adventurer.js';
import { QuestService } from '../../services/QuestService.js';
import { Quest } from '../../models/Quest.js';
import { ADVENTURER_TYPES } from '../../data/constants.js';

describe('AssignmentService - Manual', () => {
    let service;
    let guild;
    let mockUiManager;
    let questService;
    let activeQuests;

    beforeEach(() => {
        guild = new Guild();
        guild.adventurers = [
            new Adventurer('a1', 'Adv1', ADVENTURER_TYPES.WARRIOR),
            new Adventurer('a2', 'Adv2', ADVENTURER_TYPES.MAGE),
            new Adventurer('a3', 'Adv3', ADVENTURER_TYPES.ROGUE)
        ];
        mockUiManager = { log: vi.fn() };
        questService = new QuestService();
        service = new AssignmentService(guild, questService, mockUiManager);
        activeQuests = [];
    });

    it('should manually assign valid party', () => {
        const quest = new Quest('qM', 'Manual Quest', 'HUNT', { rank: 'E', powerReq: 10 }, {}, {}, {}, 2, 1, 10, {});

        const result = service.manualAssign(quest, ['a1', 'a2']);

        expect(result.success).toBe(true);
        expect(result.assignment).toBeDefined();
        expect(result.assignment.members.length).toBe(2);

        const m1 = guild.adventurers.find(a => a.id === 'a1');
        expect(m1.state).toBe('PLANNING');
    });

    it('should fail if insufficient members', () => {
        const quest = new Quest('qM', 'Manual Quest', 'HUNT', { rank: 'E', powerReq: 10 }, {}, {}, {}, 3, 1, 10, {});

        const result = service.manualAssign(quest, ['a1', 'a2']); // Need 3

        expect(result.success).toBe(false);
        expect(result.message).toContain('人数が不足');
    });

    it('should fail if adventurer is busy', () => {
        guild.adventurers[0].state = 'QUESTING';
        const quest = new Quest('qM', 'Manual Quest', 'HUNT', { rank: 'E', powerReq: 10 }, {}, {}, {}, 1, 1, 10, {});

        const result = service.manualAssign(quest, ['a1']);

        expect(result.success).toBe(false);
        expect(result.message).toContain('活動できません');
    });
});
