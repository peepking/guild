import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecruitmentService } from '../../services/RecruitmentService.js';
import { Guild } from '../../models/Guild.js';
import { JOIN_TYPES, ADVENTURER_TYPES } from '../../data/constants.js';

describe('RecruitmentService', () => {
    let service;
    let guild;

    beforeEach(() => {
        guild = new Guild();
        service = new RecruitmentService(guild);
    });

    it('should generate adventurer with valid properties', () => {
        const adv = service.generateNewAdventurer();
        expect(adv).toBeDefined();
        expect(adv.id).toBeDefined();
        expect(adv.name).toBeDefined();
        expect(adv.origin).toBeDefined();
        expect(adv.joinType).toBeDefined();
    });

    it('should generate valid join types', () => {
        // Run multiple times to catch potential issues
        for (let i = 0; i < 50; i++) {
            const adv = service.generateNewAdventurer();
            expect(Object.values(JOIN_TYPES)).toContain(adv.joinType);
        }
    });

    it('should apply rank/trust modifiers based on join type', () => {
        // Create statistical sample to verify trends (simplified for unit test)
        let contractCount = 0;
        let localCount = 0;

        // Boost reputation to allow high rank recruits
        guild.reputation = 5000; // S rank range

        // Generate enough to likely find both
        for (let i = 0; i < 100; i++) {
            const adv = service.generateNewAdventurer();
            if (adv.joinType === JOIN_TYPES.CONTRACT) {
                // Contract: Rank Range 350-900 (Potential -40 from Foreign origin)
                expect(adv.rankValue).toBeGreaterThanOrEqual(300);
                contractCount++;
            } else if (adv.joinType === JOIN_TYPES.LOCAL) {
                // Local: Rank Range 0-160
                expect(adv.rankValue).toBeLessThan(200); // 160 max + variance?
                localCount++;
            }
        }
    });

    it('should handle daily recruitment limit', () => {
        const capacity = 10;
        // Mock current adventurers to capacity
        for (let i = 0; i < capacity; i++) {
            guild.adventurers.push({ id: `filled_${i}` });
        }

        // Mock Math.random to ensure recruit happens
        const originalRandom = Math.random;
        Math.random = () => 0.001; // Force hit base chance

        const candidate = service.dailyRecruit();
        expect(candidate).toBeDefined();

        Math.random = originalRandom;
    });

    // --- New Tests for Headhunted Advisor Blocking ---

    describe('Headhunted Advisor Blocking', () => {
        it('should not generate adventurers with HEADHUNTED type in generateNewAdventurer', () => {
            // Run many times to ensure statistical coverage
            for (let i = 0; i < 100; i++) {
                const adv = service.generateNewAdventurer();
                expect(adv.type).not.toBe(ADVENTURER_TYPES.HEADHUNTED);
            }
        });

        it('should not include HEADHUNTED type in generateTemplateBatch', () => {
            const batch = service.generateTemplateBatch(100);
            batch.forEach(adv => {
                expect(adv.type).not.toBe(ADVENTURER_TYPES.HEADHUNTED);
            });
        });

        it('should not include HEADHUNTED candidates in scout event', () => {
            const mailServiceMock = {
                send: vi.fn()
            };

            // Accessing private method for testing purpose
            service._triggerScoutEvent(1, mailServiceMock);

            expect(mailServiceMock.send).toHaveBeenCalled();
            const callArgs = mailServiceMock.send.mock.calls[0];
            const data = callArgs[3]; // 4th argument is data

            expect(data.actions).toBeDefined();
            data.actions.forEach(action => {
                const candidate = action.data.candidate;
                expect(candidate.type).not.toBe(ADVENTURER_TYPES.HEADHUNTED);
            });
        });
    });
});
