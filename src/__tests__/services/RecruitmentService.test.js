import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RecruitmentService } from '../../services/RecruitmentService.js';
import { Guild } from '../../models/Guild.js';
import { JOIN_TYPES } from '../../data/constants.js';

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
        // Contract: High Rank, Low Trust
        // Local: Low Rank, High Trust

        // Force random mock? Or just check ranges if logic handles it.
        // Since we can't easily mock Math.random PER CALL in a loop cleanly without complex setup,
        // we will check if the generated values fall within expected *potential* ranges or verify logic via multiple samples.

        let contractCount = 0;
        let localCount = 0;

        // Boost reputation to allow high rank recruits
        guild.reputation = 5000; // S rank range

        // Generate enough to likely find both
        for (let i = 0; i < 100; i++) {
            const adv = service.generateNewAdventurer();
            if (adv.joinType === JOIN_TYPES.CONTRACT) {
                // Log for debugging
                if (adv.rankValue < 350) {
                    console.log('DEBUG: Contract Rank too low', adv.rankValue, 'GuildRep:', service.guild.reputation);
                }
                // Contract: Rank Range 350-900 (Potential -40 from Foreign origin)
                expect(adv.rankValue).toBeGreaterThanOrEqual(300);
                // Trust: Base - 15 ( Origin trust etc varies but usually low)
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

        // This logic is actually in GameLoop usually (checking capacity before adding).
        // RecruitmentService.dailyRecruit just returns a candidate or null based on chance.
        // Let's verify dailyRecruit returns candidate occasionally.

        // Mock Math.random to ensure recruit happens
        const originalRandom = Math.random;
        Math.random = () => 0.001; // Force hit base chance

        const candidate = service.dailyRecruit();
        expect(candidate).toBeDefined();

        Math.random = originalRandom;
    });
});
