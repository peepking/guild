
import { POLICIES, FACILITIES } from '../../src/data/ManagementData.js';

class BaseAI {
    constructor(game) {
        this.game = game;
        this.name = "BASE_AI";
        this.log = [];
    }

    // Called at the start of Management Phase (before quests)
    onDayStart() {
        // Override me
    }

    // Called when selecting quests
    // Returns array of quest IDs to assign
    onQuestSelection() {
        // Override me
        return [];
    }

    record(msg) {
        // this.log.push(`[${this.game.guild.day}] ${msg}`);
    }
}

// ------------------------------------------------------------------
// 1. 初心者 (Beginner)
// ------------------------------------------------------------------
export class BeginnerAI extends BaseAI {
    constructor(game) {
        super(game);
        this.name = "Beginner";
    }

    onDayStart() {
        // 方針: 均衡維持 (変えない)
        if (this.game.guild.activePolicy !== 'BALANCED') {
            this.game.managementService.setPolicy(this.game.guild, 'BALANCED');
        }

        // 施設: お金があれば安い順に適当に建てる
        // 初心者は詳細効果を読み込むより「なんとなく良さそう」で選ぶシミュレート
        const affordable = Object.values(FACILITIES).filter(f => {
            const currentLv = (this.game.guild.facilities && this.game.guild.facilities[f.id.toLowerCase()]) || 0;
            if (currentLv >= f.maxLevel) return false;
            const cost = f.baseCost * (currentLv === 0 ? 1 : (currentLv + 1)); // Approximate
            return this.game.guild.money >= cost;
        });

        if (affordable.length > 0) {
            // Random choice
            const target = affordable[Math.floor(Math.random() * affordable.length)];
            // Construct logic (Need facility management logic access which is usually in OperationScreen/ManagementService)
            // Simulating user click on build
            this._tryBuild(target.id);
        }

        // 採用: 誰か来たらとりあえず雇う（お金あれば）
        // GameLoop handles daily recruit automatic rejection if full, but manual scout events need handling.
        // We will check mails for scout events
        this._checkMailsForScout();
    }

    onQuestSelection() {
        const activeQuests = this.game.gameLoop.activeQuests;
        const available = [];

        // 初心者は「成功率」を見て90%以上なら行く。それ以外は怖くて行けない。
        for (const q of activeQuests) {
            // Need to form a party to check win rate. 
            // Simplified: Beginner selects best members for the job type?
            // Actually, Auto-Assign logic in GameLoop does a decent job.
            // But here we want to simulate the user's *decision* to dispatch.
            // Beginner might rely on Auto-Assign mostly.

            // Let's assume they use Auto-Assign but filter out low % quests manually.
            const assignment = this.game.gameLoop.assignmentService.suggestBestParty(q, this.game.guild.adventurers.filter(a => a.isAvailable()));
            if (!assignment) continue;

            if (!assignment.members) {
                console.log("Beginner Assignment Missing Members:", assignment);
            }
            // Check win rate
            let winRate = 0;
            try {
                winRate = this.game.gameLoop.questService.calculateSuccessChance(q, assignment.members);
            } catch (e) {
                console.error("AI Error:", e);
                continue;
            } // Returns 0.0-1.0 or similar
            if (winRate >= 0.9) {
                // Good to go
                available.push(q.id); // In a real flow, we'd need to mark them as 'planned'
                // This method is just telling the metrics/sim what to do.
                // But HeadlessGame needs to actually execute.
                // We will implement a helper in HeadlessGame or here to execute.
            }
        }
        return available;
    }

    _tryBuild(facilityId) {
        // Accessing ManagementService methods directly if possible or manipulating guild state (cheating for sim)
        // Or better: use the service properly
        // ManagementService doesn't have "build" method publicly exposed simply? 
        // It's usually in OperationScreen logic.
        // We might need to implement a simple builder here.

        const fId = facilityId.toLowerCase();
        if (!this.game.guild.facilities) this.game.guild.facilities = {};

        const currentLv = this.game.guild.facilities[fId] || 0;
        const def = FACILITIES[facilityId];
        // Cost calc
        const cost = def.baseCost * (def.costMult === 0 ? 1 : (currentLv + 1));

        if (this.game.guild.money >= cost && currentLv < def.maxLevel) {
            this.game.guild.money -= cost;
            this.game.guild.facilities[fId] = currentLv + 1;
            this.record(`Built ${facilityId} Lv${currentLv + 1}`);
        }
    }

    _checkMailsForScout() {
        // Check unread mails for SCOUT_ADVENTURER
        const mails = this.game.mailService.getMails(); // All mails
        for (const m of mails) {
            if (m.isRead) continue;
            // Mark as read
            m.isRead = true;

            if (m.type === 'EVENT' && m.meta && m.meta.actions) {
                const scoutAction = m.meta.actions.find(a => a.id === 'SCOUT_ADVENTURER');
                if (scoutAction) {
                    // Try to recruit
                    const res = this.game.gameLoop.handleMailAction('SCOUT_ADVENTURER', scoutAction.data);
                    if (res && res.success) this.record(`Scouted ${scoutAction.data.candidate.name}`);
                }
            }
        }
    }
}

// ------------------------------------------------------------------
// 2. ビルド厨 (Min-Maxer)
// ------------------------------------------------------------------
export class MinMaxerAI extends BaseAI {
    constructor(game) {
        super(game);
        this.name = "MinMaxer";
    }

    onDayStart() {
        const g = this.game.guild;

        // Policy: Commercial (early) -> Training (mid) -> Aggressive (late) purely for efficiency
        let targetPolicy = 'COMMERCIAL'; // Money is king early
        if (g.money > 5000 && g.adventurers.some(a => a.rankValue < 200)) {
            targetPolicy = 'TRAINING';
        } else if (g.money > 10000) {
            targetPolicy = 'AGGRESSIVE';
        }

        if (g.activePolicy !== targetPolicy) {
            this.game.managementService.setPolicy(g, targetPolicy);
        }

        // Facilities: smarter ordering with admin focus and cap-aware HQ upgrades
        const priorities = [];
        const adminLv = (g.facilities && g.facilities.administration) || 0;
        const activeQuestCount = this.game.gameLoop.activeQuests.length;

        // Prioritize Administration early or when quest supply is low
        if (adminLv < 3 || activeQuestCount < 6) priorities.push('ADMINISTRATION');

        priorities.push('SHOP', 'TAVERN');

        // Only push PR if we are under soft cap to grow roster faster
        if (g.adventurers.length < g.softCap) priorities.push('PUBLIC_RELATIONS');

        priorities.push('TRAINING');

        // Library helps special quest rate; keep it in the mix but later
        if (((g.facilities && g.facilities.library) || 0) < 2) priorities.push('LIBRARY');

        priorities.push('EXTENSIONLEVEL');

        for (const pid of priorities) {
            if (pid === 'EXTENSIONLEVEL') {
                // HQ Special case
                const currentLv = g.facilities.extensionLevel || 0;
                // No Max Level check (softCap based)
                const currentCap = g.softCap || 10;
                const cost = currentCap * 100; // OperationScreen Logic

                // Only expand HQ when near cap
                if (g.adventurers.length >= g.softCap - 1 && g.money >= cost) {
                    g.money -= cost;
                    g.facilities.extensionLevel = currentLv + 1;
                    g.softCap = currentCap + 5; // OperationScreen logic mirroring
                    this.record(`Upgraded HQ to Lv${currentLv + 1} (Cap: ${g.softCap})`);
                    break;
                }
                continue;
            }

            const fId = pid.toLowerCase();
            const currentLv = (g.facilities && g.facilities[fId]) || 0;
            const def = FACILITIES[pid];
            if (currentLv < def.maxLevel) {
                const cost = def.baseCost * (currentLv + 1);
                if (g.money >= cost) {
                    this._tryBuild(pid);
                    break; // One per day to be safe? Or all in? Min-maxer would all in.
                }
            }
        }

        // Scouting: Check stat potentials
        this._checkMailsForEffectiveScout();
    }

    onQuestSelection() {
        // Calculate G/Day for all quests and pick best
        // Also considers 100% win rate mandatory unless return is massive
        // Actually MinMaxer hates failing.

        const activeQuests = this.game.gameLoop.activeQuests;
        const candidates = [];

        for (const q of activeQuests) {
            // console.log(`[AI CHECK] Checking ${q.title}`);
            // Find best party
            const assignment = this.game.gameLoop.assignmentService.suggestBestParty(q, this.game.guild.adventurers.filter(a => a.isAvailable()));
            if (!assignment) {
                if (this.game.guild.day <= 2) console.log(`[AI FAIL] No party for ${q.title}`);
                continue;
            }

            let winRate = 0;
            // SPECIAL: Tournament depends on battle, stats don't map directly to winRate via QuestService in sim check
            // So we blindly trust tournaments are worth it if we have a party.
            if (q.isTournament) {
                winRate = 1.0;
            } else {
                try {
                    winRate = this.game.gameLoop.questService.calculateSuccessChance(q, assignment.members);
                } catch (e) {
                    console.error("AI Error:", e);
                    continue;
                }
            }

            if (winRate < 0.95) {
                // Grinding Logic: Accept E-rank if > 45% to build Rep
                if (q.difficulty.rank === 'E' && winRate >= 0.45) {
                    // Accept for grinding
                } else {
                    // Strict rejection
                    // if (this.game.guild.day <= 5) console.log(`[AI DEBUG] Rejecting ${q.title}...`);
                    continue;
                }
            }

            // Efficiency
            const reward = q.rewards.money; // Simplified
            const days = q.difficulty.days || 1;
            const efficiency = reward / days;

            candidates.push({ id: q.id, eff: efficiency });
        }

        // Sort by efficiency
        candidates.sort((a, b) => b.eff - a.eff);
        return candidates.map(c => c.id);
    }

    _tryBuild(facilityId) {
        const fId = facilityId.toLowerCase();
        if (!this.game.guild.facilities) this.game.guild.facilities = {};

        const currentLv = this.game.guild.facilities[fId] || 0;
        const def = FACILITIES[facilityId];
        const cost = def.baseCost * (currentLv + 1);

        if (this.game.guild.money >= cost && currentLv < def.maxLevel) {
            this.game.guild.money -= cost;
            this.game.guild.facilities[fId] = currentLv + 1;
            this.record(`Built ${facilityId} Lv${currentLv + 1}`);
        }
    }

    _checkMailsForEffectiveScout() {
        const mails = this.game.mailService.getMails();
        for (const m of mails) {
            if (m.isRead) continue;
            m.isRead = true;
            if (m.type === 'EVENT' && m.meta && m.meta.actions) {
                const actions = m.meta.actions.filter(a => a.id === 'SCOUT_ADVENTURER');
                // Pick highest stat total
                let best = null;
                let bestStat = -1;

                for (const act of actions) {
                    const s = act.data.candidate.stats;
                    const total = s.STR + s.VIT + s.DEX + s.MAG + s.INT + s.CHA;
                    if (total > bestStat) {
                        bestStat = total;
                        best = act;
                    }
                }

                if (best && bestStat > 150) { // Only scout strong ones
                    this.game.gameLoop.handleMailAction('SCOUT_ADVENTURER', best.data);
                }
            }
        }
    }
}

// ------------------------------------------------------------------
// 3. 逆張り (Contrarian)
// ------------------------------------------------------------------
export class ContrarianAI extends BaseAI {
    constructor(game) {
        super(game);
        this.name = "Contrarian";
    }

    onDayStart() {
        // Money low? Spend more! Money high? Hoard!
        // Just behaves irrationally or opposite to common sense

        const g = this.game.guild;
        if (g.money < 2000) {
            // Low money -> Agressive policy
            if (g.activePolicy !== 'AGGRESSIVE') this.game.managementService.setPolicy(g, 'AGGRESSIVE');
        } else {
            // High money -> Safe policy
            if (g.activePolicy !== 'SAFE') this.game.managementService.setPolicy(g, 'SAFE');
        }

        // Build quirky things like Warehouse early
        if (g.money > 3000) {
            if (!g.facilities?.warehouse) this._tryBuild('WAREHOUSE');
        }

        // Advisor? Only headhunt (expensive)
        if (g.todayFinance && g.day % 10 === 0) {
            // Try headhunt if possible
            this.game.managementService.headhuntAdvisor(g);
        }
    }

    onQuestSelection() {
        const activeQuests = this.game.gameLoop.activeQuests;
        const available = [];

        // Gambler: Likes 50-70% win rate. Hates 100%.
        for (const q of activeQuests) {
            const assignment = this.game.gameLoop.assignmentService.suggestBestParty(q, this.game.guild.adventurers.filter(a => a.isAvailable()));
            if (!assignment) continue;

            let winRate = 0;
            try {
                winRate = this.game.gameLoop.questService.calculateSuccessChance(q, assignment.members);
            } catch (e) {
                console.error("AI Error:", e);
                continue;
            }
            if (winRate >= 0.4 && winRate <= 0.8) {
                available.push(q.id);
            }
        }
        return available;
    }

    _tryBuild(facilityId) {
        const fId = facilityId.toLowerCase();
        if (!this.game.guild.facilities) this.game.guild.facilities = {};

        const currentLv = this.game.guild.facilities[fId] || 0;
        const def = FACILITIES[facilityId];
        const cost = def.baseCost * (currentLv + 1);

        if (this.game.guild.money >= cost && currentLv < def.maxLevel) {
            this.game.guild.money -= cost;
            this.game.guild.facilities[fId] = currentLv + 1;
            this.record(`Built ${facilityId} Lv${currentLv + 1}`);
        }
    }
}

// ------------------------------------------------------------------
// 4. 縛り勢 (Restriction)
// ------------------------------------------------------------------
export class RestrictionAI extends BaseAI {
    constructor(game) {
        super(game);
        this.name = "Restriction";
        this.restriction = "LV1_FACILITY"; // Start with this
    }

    onDayStart() {
        // Policy: Balanced or Training
        if (this.game.guild.activePolicy !== 'TRAINING') {
            this.game.managementService.setPolicy(this.game.guild, 'TRAINING');
        }

        // Facilities: Only build Lv1. Never upgrade to Lv2.
        const canBuild = Object.values(FACILITIES).filter(f => {
            const currentLv = (this.game.guild.facilities && this.game.guild.facilities[f.id.toLowerCase()]) || 0;
            return currentLv === 0; // Only fresh build
        });

        if (canBuild.length > 0) {
            const target = canBuild[Math.floor(Math.random() * canBuild.length)];
            this._tryBuild(target.id);
        }
    }
    onQuestSelection() {
        // Standard conservative
        const activeQuests = this.game.gameLoop.activeQuests;
        const available = [];
        for (const q of activeQuests) {
            const assignment = this.game.gameLoop.assignmentService.suggestBestParty(q, this.game.guild.adventurers.filter(a => a.isAvailable()));
            if (!assignment) continue;
            let winRate = 0;
            try {
                winRate = this.game.gameLoop.questService.calculateSuccessChance(q, assignment.members);
            } catch (e) {
                console.error("AI Error:", e);
                continue;
            }
            if (winRate >= 0.8) {
                available.push(q.id);
            }
        }
        return available;
    }

    _tryBuild(facilityId) {
        const fId = facilityId.toLowerCase();
        if (!this.game.guild.facilities) this.game.guild.facilities = {};

        const currentLv = this.game.guild.facilities[fId] || 0;
        const def = FACILITIES[facilityId];
        const cost = def.baseCost * (currentLv + 1);

        if (this.game.guild.money >= cost && currentLv < def.maxLevel) {
            this.game.guild.money -= cost;
            this.game.guild.facilities[fId] = currentLv + 1;
            this.record(`Built ${facilityId} Lv${currentLv + 1}`);
        }
    }
}

// ------------------------------------------------------------------
// 5. せっかち (Hasty)
// ------------------------------------------------------------------
export class HastyAI extends BaseAI {
    constructor(game) {
        super(game);
        this.name = "Hasty";
    }

    onDayStart() {
        // Rarely builds (forgot to check menu) - 10% chance
        if (Math.random() < 0.1) {
            // Build random affordable
            const affordable = Object.values(FACILITIES).filter(f => {
                const currentLv = (this.game.guild.facilities && this.game.guild.facilities[f.id.toLowerCase()]) || 0;
                if (currentLv >= f.maxLevel) return false;
                const cost = f.baseCost * (currentLv + 1);
                return this.game.guild.money >= cost;
            });
            if (affordable.length > 0) {
                this._tryBuild(affordable[0].id); // Just the first one
            }
        }

        // Mails? "Mark all as read" without reading
        if (this.game.mailService.getUnreadCount() > 0) {
            this.game.mailService.markAllAsRead();
        }
    }

    onQuestSelection() {
        // Top 3 available regardless of winrate (as long as > 0 possibly)
        const activeQuests = this.game.gameLoop.activeQuests;
        const available = [];

        for (const q of activeQuests) {
            const assignment = this.game.gameLoop.assignmentService.suggestBestParty(q, this.game.guild.adventurers.filter(a => a.isAvailable()));
            if (!assignment) continue;

            // Just take it
            available.push(q.id);
            if (available.length >= 5) break; // Don't even look at the rest
        }
        return available;
    }
    _tryBuild(facilityId) {
        const fId = facilityId.toLowerCase();
        if (!this.game.guild.facilities) this.game.guild.facilities = {};

        const currentLv = this.game.guild.facilities[fId] || 0;
        const def = FACILITIES[facilityId];
        const cost = def.baseCost * (currentLv + 1);

        if (this.game.guild.money >= cost && currentLv < def.maxLevel) {
            this.game.guild.money -= cost;
            this.game.guild.facilities[fId] = currentLv + 1;
            this.record(`Built ${facilityId} Lv${currentLv + 1}`);
        }
    }
}
