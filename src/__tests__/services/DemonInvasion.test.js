
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestService } from '../../services/QuestService';
import { GameLoop } from '../../core/GameLoop';
import { Guild } from '../../models/Guild';
import { GUILD_RANK_THRESHOLDS, QUEST_RANK_VALUE } from '../../data/constants';

describe('Demon Invasion System', () => {
    let questService;
    let guild;
    let gameLoop;
    let uiManagerMock;

    beforeEach(() => {
        questService = new QuestService();
        guild = new Guild("Test Guild", "Test Master");
        uiManagerMock = { log: vi.fn(), render: vi.fn() };
        gameLoop = new GameLoop(guild, uiManagerMock, questService);

        // Initialize demonInvasion state
        if (!guild.demonInvasion) {
            guild.demonInvasion = {
                status: 'QUIET',
                offensePhase: 1,
                defensePhase: 1,
                raidAvailable: false
            };
        }
    });

    describe('Quest Generation', () => {
        it('should NOT generate demon quests for Rank D guild', () => {
            const reputation = 100; // Rank D (Threshold 100)
            const quests = questService.generateDemonInvasionQuests(1, guild.demonInvasion, reputation, []);
            expect(quests.length).toBe(0);
        });

        it('should generate single occurrence quests for Rank C guild (chance)', () => {
            const reputation = 500; // Rank C (Threshold 500)
            // Mock Math.random to ensure generation ( < 0.2)
            vi.spyOn(Math, 'random').mockReturnValue(0.1);

            const quests = questService.generateDemonInvasionQuests(1, guild.demonInvasion, reputation, []);
            expect(quests.length).toBeGreaterThan(0);
            const validTypes = ['CULT_PURGE', 'SMALL_RAID', 'KIDNAP_INVESTIGATION', 'MARCH_RECON'];
            expect(validTypes).toContain(quests[0].type);

            vi.restoreAllMocks();
        });

        it('should generate phased quests for Rank B guild', () => {
            const reputation = 1500; // Rank B (Threshold 1500)

            const quests = questService.generateDemonInvasionQuests(1, guild.demonInvasion, reputation, []);

            // Phase 1 is default
            const offense = quests.find(q => q.type === 'OFFENSE_BREAKTHROUGH');
            const defense = quests.find(q => q.type === 'DEFENSE_FRONTLINE');

            expect(offense).toBeDefined();
            expect(defense).toBeDefined();
        });

        it('should generate correct phase quests based on state', () => {
            const reputation = 1500;
            guild.demonInvasion.offensePhase = 2; // Next is OFFENSE_CAMP_RAID
            guild.demonInvasion.defensePhase = 3; // Next is DEFENSE_FORT

            const quests = questService.generateDemonInvasionQuests(1, guild.demonInvasion, reputation, []);

            const offense = quests.find(q => q.type === 'OFFENSE_CAMP_RAID');
            const defense = quests.find(q => q.type === 'DEFENSE_FORT');

            expect(offense).toBeDefined();
            expect(defense).toBeDefined();
            expect(quests.find(q => q.type === 'OFFENSE_BREAKTHROUGH')).toBeUndefined();
        });

        it('should generate raid quest for Rank A guild when available', () => {
            const reputation = 4500; // Rank A (Threshold 4500)
            guild.demonInvasion.raidAvailable = true;

            const quests = questService.generateDemonInvasionQuests(1, guild.demonInvasion, reputation, []);
            const raid = quests.find(q => q.type === 'RAID_GENERAL_SUBJUGATION');

            expect(raid).toBeDefined();
            expect(raid.partySize).toBe(20);
            expect(raid.manualOnly).toBe(true);
        });
    });

    describe('GameLoop Phase Progression', () => {
        it('should advance Offense Phase on success', () => {
            guild.demonInvasion.offensePhase = 1;

            // Mock result
            const result = {
                success: true,
                quest: {
                    type: 'OFFENSE_BREAKTHROUGH',
                    id: 'q_test_1',
                    title: '【魔王軍】Test Offense',
                    difficulty: { rank: 'B', baseReward: 100 },
                    rewards: { money: 100, reputation: 10 },
                    penalty: { money: 0, reputation: 0 }
                },
                party: [],
                memberResults: [],
                reward: { money: 100, reputation: 10 },
                effectivePenalty: { money: 0, reputation: 0 }
            };

            gameLoop._handleQuestResult(result, { members: [] });

            expect(guild.demonInvasion.offensePhase).toBe(2);
            expect(uiManagerMock.log).toHaveBeenCalledWith(expect.stringContaining('攻勢フェーズが進みました'), 'event');
        });

        it('should complete Offense Phase and maybe trigger Raid', () => {
            guild.demonInvasion.offensePhase = 3;
            vi.spyOn(Math, 'random').mockReturnValue(0.1);

            const result = {
                success: true,
                quest: {
                    type: 'OFFENSE_GENERAL_HUNT',
                    id: 'q_test_2',
                    title: '【魔王軍】Test Hunt',
                    difficulty: { rank: 'A', baseReward: 100 },
                    rewards: { money: 100, reputation: 10 },
                    penalty: { money: 0, reputation: 0 }
                },
                party: [],
                memberResults: [],
                reward: { money: 100 },
                effectivePenalty: {}
            };

            gameLoop._handleQuestResult(result, { members: [] });

            expect(guild.demonInvasion.offensePhase).toBe(1);
            expect(guild.demonInvasion.raidAvailable).toBe(true);

            vi.restoreAllMocks();
        });

        it('should clear Raid status on success', () => {
            guild.demonInvasion.raidAvailable = true;
            const result = {
                success: true,
                quest: {
                    type: 'RAID_GENERAL_SUBJUGATION',
                    id: 'q_test_3',
                    title: '【決戦】【魔王軍】Test Raid',
                    difficulty: { rank: 'S', baseReward: 100 },
                    rewards: { money: 100, reputation: 10 },
                    penalty: { money: 0, reputation: 0 }
                },
                party: [],
                memberResults: [],
                reward: { money: 100 },
                effectivePenalty: {}
            };

            gameLoop._handleQuestResult(result, { members: [] });
            expect(guild.demonInvasion.raidAvailable).toBe(false);
        });
    });
});
