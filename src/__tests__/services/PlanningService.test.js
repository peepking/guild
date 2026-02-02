import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssignmentService } from '../../services/AssignmentService.js';
import { Guild } from '../../models/Guild.js';
import { Adventurer } from '../../models/Adventurer.js';
import { QuestService } from '../../services/QuestService.js';
import { Quest } from '../../models/Quest.js';
import { ADVENTURER_TYPES } from '../../data/constants.js';

describe('AssignmentService - Planning', () => {
    let service;
    let guild;
    let mockUiManager;
    let questService;

    beforeEach(() => {
        guild = new Guild();
        guild.adventurers = [
            new Adventurer('a1', 'Adv1', ADVENTURER_TYPES.WARRIOR),
            new Adventurer('a2', 'Adv2', ADVENTURER_TYPES.MAGE),
            new Adventurer('a3', 'Adv3', ADVENTURER_TYPES.ROGUE)
        ];
        // Ensure they are IDLE
        guild.adventurers.forEach(a => a.state = 'IDLE');

        mockUiManager = { log: vi.fn() };
        questService = new QuestService();
        service = new AssignmentService(guild, questService, mockUiManager);
    });

    it('should auto-assign adventurers to quests', () => {
        // Mock quest with weights to generate score
        const quest = new Quest('q1', 'Test Quest', 'HUNT', { rank: 'E', powerReq: 10 }, { STR: 1 }, { money: 100 }, {}, 1, 1, 10, {});
        const activeQuests = [quest];

        // Ensure adventurers have enough stats to pass 0.9*target
        // E rank powerReq 10. Warrior STR 60 > 10.

        const plans = service.autoAssign(activeQuests);

        expect(plans.length).toBe(1);
        expect(plans[0].quest.id).toBe('q1');
        expect(plans[0].members[0].state).toBe('PLANNING');
    });

    it('should not assign busy adventurers', () => {
        guild.adventurers[0].state = 'QUESTING';
        const quest = new Quest('q1', 'Test Quest', 'HUNT', { rank: 'E', powerReq: 10 }, { STR: 1 }, { money: 100 }, {}, 1, 1, 10, {});

        const plans = service.autoAssign([quest]);

        // Should use other adventurers
        const assignedIds = plans[0].members.map(m => m.id);
        expect(assignedIds).not.toContain('a1');
    });

    it('should cancel planning correctly', () => {
        const quest = new Quest('q1', 'Test Quest', 'HUNT', { rank: 'E', powerReq: 10 }, { STR: 1 }, { money: 100 }, {}, 1, 1, 10, {});
        const plans = service.autoAssign([quest]);
        const assignment = plans[0];

        const plannedQuests = [assignment];
        const ongoingQuests = [];

        const result = service.cancelAssignment(assignment, ongoingQuests, plannedQuests);

        expect(result.success).toBe(true);
        expect(plannedQuests.length).toBe(0);
        expect(assignment.members[0].state).toBe('IDLE');
    });

    it('should NOT cancel ongoing quests via planning cancel', () => {
        // Setup manual ongoing
        const quest = new Quest('q1', 'Test Quest', 'HUNT', { rank: 'E', powerReq: 10 }, { STR: 1 }, { money: 100 }, {}, 1, 1, 10, {});
        const adv = guild.adventurers[0];
        adv.state = 'QUESTING';

        // Mock assignment object
        const assignment = { members: [adv], quest: quest };
        const plannedQuests = [];
        const ongoingQuests = [assignment];

        const result = service.cancelAssignment(assignment, ongoingQuests, plannedQuests);

        expect(result.success).toBe(false);
        expect(adv.state).toBe('QUESTING');
    });
});
