
import { POLICIES, ADVISOR_ROLES, RANDOM_EVENTS, FACILITIES } from '../data/ManagementData.js';
import { CONSTANTS } from '../data/constants.js';

export class ManagementService {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Daily update for policies, events, and salaries.
     * @param {Object} guild 
     */
    dailyUpdate(guild) {
        // 1. Pay Salaries
        this._payAdvisorSalaries(guild);

        // 2. Event Timers
        this._updateEvents(guild);

        // 3. Facility Income (Shop & Tavern)
        this._processFacilityIncome(guild);

        // 4. Roll for new events
        if (guild.activeEvents.length === 0) {
            if (Math.random() < 0.05) { // 5% chance
                this._triggerRandomEvent(guild);
            }
        }
    }

    _processFacilityIncome(guild) {
        const advCount = guild.adventurers.length;
        if (advCount === 0) return;

        let totalIncome = 0;
        const details = [];

        // Shop Income: 10G * Lv * Count
        const shopLv = (guild.facilities && guild.facilities.shop) || 0;
        if (shopLv > 0) {
            const income = 10 * shopLv * advCount;
            totalIncome += income;
            details.push({ reason: `売店売上 (Lv.${shopLv})`, amount: income });
        }

        // Tavern Income: 15G * Lv * Count
        const tavernLv = (guild.facilities && guild.facilities.tavern) || 0;
        if (tavernLv > 0) {
            const income = 15 * tavernLv * advCount;
            totalIncome += income;
            details.push({ reason: `酒場売上 (Lv.${tavernLv})`, amount: income });
        }

        if (totalIncome > 0) {
            guild.money += totalIncome;
            if (guild.todayFinance) {
                guild.todayFinance.income += totalIncome;
                guild.todayFinance.balance = guild.money;
                guild.todayFinance.details.push(...details);
            }
            // this.uiManager.log(`施設収益: +${totalIncome}G`, 'info'); // Optional to reduce spam
        }
    }

    _payAdvisorSalaries(guild) {
        const totalSalary = guild.advisors.reduce((sum, adv) => sum + (adv.salary || 0), 0);
        if (totalSalary > 0) {
            if (guild.money >= totalSalary) {
                guild.money -= totalSalary;
                // Log finance?
                if (guild.todayFinance) {
                    guild.todayFinance.expense += totalSalary;
                    guild.todayFinance.balance = guild.money;
                    guild.todayFinance.details.push({ reason: '顧問給与', amount: -totalSalary });
                }
            } else {
                // Cant pay? Fire someone? Or debt? 
                // Simple: Debt / Warning.
                this.uiManager.log(`資金不足のため顧問への給与(${totalSalary}G)が未払いです。`, 'warning');
            }
        }
    }

    _updateEvents(guild) {
        for (let i = guild.activeEvents.length - 1; i >= 0; i--) {
            const evt = guild.activeEvents[i];
            evt.remainingDays--;
            if (evt.remainingDays <= 0) {
                guild.activeEvents.splice(i, 1);
                this.uiManager.log(`イベント「${evt.name}」が終了しました。`, 'info');
            }
        }
    }

    _triggerRandomEvent(guild) {
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        // Check if already active (though array logic handles multiple, duplicate implies stack or extend? simplify: one event max for now)
        if (guild.activeEvents.length > 0) return;

        guild.activeEvents.push({
            id: event.id,
            name: event.name,
            description: event.description,
            mod: event.mod,
            remainingDays: event.duration
        });
        this.uiManager.log(`【イベント発生】${event.name}: ${event.description}`, 'event');
    }

    // --- Policy ---
    canChangePolicy(guild) {
        // Only allow once a week? Or flexible? 
        // Plan says: Changeable once per week (Day % 7 === 0)
        // Let's stick to Plan. But maybe Day 1 is exception.
        return (guild.day % 7 === 0);
    }

    setPolicy(guild, policyId) {
        if (!POLICIES[policyId]) return false;
        guild.activePolicy = policyId;
        const p = POLICIES[policyId];
        this.uiManager.log(`ギルドの方針を「${p.name}」に変更しました。`, 'info');
        return true;
    }

    getPolicy(guild) {
        return POLICIES[guild.activePolicy] || POLICIES.BALANCED;
    }

    // --- Advisors ---
    // Called when an adventurer retires (Rank B+ only)
    checkAndAddCandidate(guild, adventurer) {
        // Must be Retired or Leaving peacefully? 
        // Logic in GameLoop handles "RETIRE" vs "LEAVE".
        // Threshold: Rank value > 400 (roughly B middle)?
        if (adventurer.rankValue < 480) return; // Must be B rank (480+)

        // Determine role based on highest stat
        const role = this._determineAdvisorRole(adventurer.stats);
        if (!role) return;

        // Salary based on Rank
        const salary = Math.floor(adventurer.rankValue / 10); // e.g., 500 -> 50G/day

        guild.advisorCandidates.push({
            id: adventurer.id,
            name: adventurer.name,
            origin: adventurer.origin,
            rankLabel: adventurer.rankLabel,
            roleId: role.id,
            roleName: role.name,
            effect: role.effect,
            desc: role.desc,
            salary: salary,
            retiredDay: guild.day
        });
    }

    _determineAdvisorRole(stats) {
        // Find highest stat
        let maxVal = -1;
        let bestStat = null;
        for (const [k, v] of Object.entries(stats)) {
            if (v > maxVal) {
                maxVal = v;
                bestStat = k;
            }
        }

        // Find role matching stat
        for (const roleId in ADVISOR_ROLES) {
            if (ADVISOR_ROLES[roleId].stat === bestStat) {
                return ADVISOR_ROLES[roleId];
            }
        }
        return ADVISOR_ROLES.TACTICIAN; // Fallback
    }

    hireAdvisor(guild, candidateId) {
        const idx = guild.advisorCandidates.findIndex(c => c.id === candidateId);
        if (idx === -1) return false;

        // Slot limit? Start with 1.
        // Facilities extension could increase this.
        const maxSlots = 1 + (guild.facilities.extensionLevel >= 2 ? 1 : 0) + (guild.facilities.extensionLevel >= 4 ? 1 : 0);

        if (guild.advisors.length >= maxSlots) {
            this.uiManager.log(`顧問枠がいっぱいです。(最大${maxSlots}名)`, 'warning');
            return false;
        }

        const candidate = guild.advisorCandidates[idx];
        guild.advisorCandidates.splice(idx, 1);
        guild.advisors.push(candidate);
        candidate.hiredDay = guild.day;

        this.uiManager.log(`${candidate.name} を ${candidate.roleName} として雇用しました。(日給 ${candidate.salary}G)`, 'success');
        return true;
    }

    fireAdvisor(guild, advisorId) {
        const idx = guild.advisors.findIndex(a => a.id === advisorId);
        if (idx === -1) return false;

        const advisor = guild.advisors[idx];
        guild.advisors.splice(idx, 1);

        // Return to candidates? Or gone forever?
        // Gone forever seems more realistic for firing.
        this.uiManager.log(`${advisor.name} との顧問契約を解除しました。`, 'info');
        return true;
    }

    // Helper to get total modifiers
    getGlobalModifiers(guild) {
        const mods = { ...POLICIES[guild.activePolicy].mod }; // Copy policy mods

        // Add Advisor mods
        guild.advisors.forEach(adv => {
            const eff = adv.effect;
            for (const [k, v] of Object.entries(eff)) {
                // Multiplicative or additive?
                // Let's go multiplicative for rates, additive for flat?
                // Most are rates (1.1, etc). Multiply.
                mods[k] = (mods[k] || 1.0) * v;
            }
        });

        // Add Event mods
        guild.activeEvents.forEach(evt => {
            if (evt.mod) {
                for (const [k, v] of Object.entries(evt.mod)) {
                    mods[k] = (mods[k] || 1.0) * v;
                }
            }
        });

        return mods;
    }
}
