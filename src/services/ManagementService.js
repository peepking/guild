
import { POLICIES, ADVISOR_ROLES, RANDOM_EVENTS, FACILITIES } from '../data/ManagementData.js';
import { CONSTANTS, ADVISOR_CONFIG, ADVENTURER_TYPES, ADVENTURER_JOB_NAMES, ADVENTURER_RANKS } from '../data/constants.js';
import { REGIONAL_NAMES } from '../data/Names.js';

export class ManagementService {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Daily update for policies, events, and salaries.
     * ポリシー、イベント、給与の日次更新
     * @param {Object} guild 
     */
    dailyUpdate(guild) {
        // 1. Pay Salaries (Monthly)
        // 1. 給与支払い (月次)
        if (guild.day > 0 && guild.day % ADVISOR_CONFIG.SALARY_INTERVAL === 0) {
            this._payAdvisorSalaries(guild);
        }

        // 1.5 Contract Expiration (Headhunted Advisors)
        this._checkAdvisorContracts(guild);

        // 2. Event Timers
        // 2. イベントタイマー
        this._updateEvents(guild);

        // 3. Facility Income (Shop & Tavern)
        // 3. 施設収益 (売店&酒場)
        this._processFacilityIncome(guild);

        // 4. Roll for new events
        // 4. 新規イベント抽選
        if (guild.activeEvents.length === 0) {
            if (Math.random() < 0.05) { // 5% chance
                this._triggerRandomEvent(guild);
            }
        }

        // 5. Meikan (Career) Update
        // 5. 名鑑(経歴)更新 (30日ごと)
        if (guild.day > 0 && guild.day % 30 === 0) {
            guild.adventurers.forEach(adv => {
                if (adv.updateBio) {
                    const careerData = {
                        questCount: Object.values(adv.records.quests).reduce((a, b) => a + b, 0),
                        topMonster: adv.records.majorKills.length > 0 ? adv.records.majorKills[0].name : null,
                        topQuestType: this._getTopQuestType(adv.records.quests),
                    };
                    adv.updateBio('CAREER', { careerData });
                }
            });
        }
    }

    _getTopQuestType(quests) {
        let max = 0;
        let type = null;
        for (const [k, v] of Object.entries(quests)) {
            if (v > max) {
                max = v;
                type = k;
            }
        }
        return type;
    }

    _processFacilityIncome(guild) {
        const advCount = guild.adventurers.length;
        if (advCount === 0) return;

        let totalIncome = 0;
        const details = [];

        // グローバル補正 (市場需要)
        const globalMods = this.getGlobalModifiers(guild);
        const marketMod = globalMods.market || 1.0;

        // Shop Income: 2G * Lv * Count
        // 売店収益: 2G * Lv * Count
        const shopLv = (guild.facilities && guild.facilities.shop) || 0;
        if (shopLv > 0) {
            const income = Math.floor(2 * shopLv * advCount * marketMod);
            totalIncome += income;
            details.push({ reason: `売店売上 (Lv.${shopLv})`, amount: income });
        }

        // Tavern Income: 3G * Lv * Count
        // 酒場収益: 3G * Lv * Count
        const tavernLv = (guild.facilities && guild.facilities.tavern) || 0;
        if (tavernLv > 0) {
            const income = Math.floor(3 * tavernLv * advCount * marketMod);
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
        if (guild.advisors.length === 0) return;

        const totalSalary = guild.advisors.length * ADVISOR_CONFIG.SALARY;
        if (guild.money >= totalSalary) {
            guild.money -= totalSalary;
            if (guild.todayFinance) {
                guild.todayFinance.expense += totalSalary;
                guild.todayFinance.balance = guild.money;
                guild.todayFinance.details.push({ reason: `顧問給与(${guild.advisors.length}名)`, amount: -totalSalary });
            }
            this.uiManager.log(`顧問団への給与(計${totalSalary}G)を支払いました。`, 'info');
        } else {
            // Debt / Warning
            this.uiManager.log(`資金不足のため顧問への給与(${totalSalary}G)が未払いです。`, 'warning');
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
        // 既にアクティブかチェック (重複は延長かスタックか? 今は最大1つに単純化)
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

    _checkAdvisorContracts(guild) {
        if (!guild.advisors) return;

        for (let i = guild.advisors.length - 1; i >= 0; i--) {
            const adv = guild.advisors[i];
            if (adv.remainingContract !== undefined) {
                adv.remainingContract--;
                if (adv.remainingContract <= 0) {
                    guild.advisors.splice(i, 1);
                    this.uiManager.log(`顧問 ${adv.name} は任期満了に伴い退任しました。`, 'info');
                } else if (adv.remainingContract === 5) {
                    this.uiManager.log(`顧問 ${adv.name} の任期が残り5日です。`, 'warning');
                }
            }
        }
    }

    // --- Policy ---
    // --- 方針 ---
    canChangePolicy(guild) {
        // Changed to allow anytime update as per user request
        // いつでも変更可能に変更 (ユーザー要望)
        return true;
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
    // --- 顧問 ---
    // Called when an adventurer retires (Rank B+ only)
    // 冒険者が引退したときに呼び出し (ランクB+のみ)
    // --- Advisors ---
    // --- 顧問 ---
    // Called when an adventurer retires
    // 冒険者が引退したときに呼び出し
    sendAdvisorOfferMail(guild, adventurer, mailService) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) return;

        // Create mail
        const title = "【顧問契約の申し出】";
        const message = `${adventurer.name}より:\n\nお世話になりました。\n冒険者としての活動は引退いたしますが、\nこれまでの経験を活かし、ギルドの顧問として貢献したいと考えております。\n\nもしよろしければ、顧問契約の締結をご検討ください。\n(賃金: ${ADVISOR_CONFIG.SALARY}G / 30日)`;

        // Save candidate data in mail "payload" or globally? 
        // For simplicity, we can just use the adventurer object ID if they are in retiredAdventurers.
        // Or store temp object in a list? 
        // Better: Use `advisorCandidates` strictly for this interaction state if needed, 
        // but since we want button in Mail, we pass data via mail action.

        const candidateData = {
            id: adventurer.id,
            name: adventurer.name,
            type: adventurer.type,
            rankLabel: adventurer.rankLabel,
            stats: adventurer.stats
        };

        if (mailService) {
            mailService.send(
                title,
                message,
                'NORMAL',
                candidateData,
                'ADVISOR_OFFER' // Action ID
            );
        }
    }

    hireAdvisor(guild, candidateData) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) {
            this.uiManager.log(`顧問枠がいっぱいです。(最大${ADVISOR_CONFIG.MAX_ADVISORS}名)`, 'warning');
            return { success: false, message: '顧問枠がいっぱいです' };
        }

        // Check duplicates (should rely on ID)
        if (guild.advisors.find(a => a.id === candidateData.id)) {
            return { success: false, message: '既に雇用されています' };
        }

        // Determine Effect
        let config = ADVISOR_CONFIG.EFFECTS[candidateData.type] || ADVISOR_CONFIG.EFFECTS.DEFAULT;
        if (candidateData.isHeadhunted) {
            config = ADVISOR_CONFIG.EFFECTS.HEADHUNTED;
        }

        const advisor = {
            ...candidateData,
            effect: config,
            hiredDay: guild.day
        };

        guild.advisors.push(advisor);
        this.uiManager.log(`${advisor.name} と顧問契約を結びました。`, 'success');
        return { success: true, message: '雇用しました' };
    }

    // New: Headhunt ("Generic Advisor")
    headhuntAdvisor(guild) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) {
            this.uiManager.log('顧問枠がいっぱいです。', 'warning');
            return false;
        }
        if (guild.money < ADVISOR_CONFIG.HEADHUNT_COST) {
            this.uiManager.log('資金が足りません。', 'warning');
            return false;
        }

        guild.money -= ADVISOR_CONFIG.HEADHUNT_COST;
        if (guild.todayFinance) {
            guild.todayFinance.expense += ADVISOR_CONFIG.HEADHUNT_COST;
            guild.todayFinance.balance = guild.money;
            guild.todayFinance.details.push({ reason: '外部招聘費', amount: -ADVISOR_CONFIG.HEADHUNT_COST });
        }

        // Determine Name (Random from all regions, similar to Central City logic)
        const regionKeys = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
        const randomRegion = regionKeys[Math.floor(Math.random() * regionKeys.length)];
        const nameList = REGIONAL_NAMES[randomRegion];
        const randomName = nameList[Math.floor(Math.random() * nameList.length)];

        // Fixed stats for B Rank Headhunted Advisor
        const id = `headhunt_${guild.day}_${Math.floor(Math.random() * 1000)}`;
        const candidateData = {
            id: id,
            name: randomName,
            type: 'HEADHUNTED',
            rankLabel: 'B',
            roleName: '招聘顧問',
            salary: ADVISOR_CONFIG.SALARY,
            isHeadhunted: true,
            remainingContract: ADVISOR_CONFIG.HEADHUNT_TERM, // 90 days
            stats: {} // Stats aren't used for logic much, but we could add flavor stats if needed
        };

        this.hireAdvisor(guild, candidateData);
        return true;
    }

    // New: Appoint (Promote active B+ adventurer)
    appointAdvisor(guild, adventurerId) {
        const advIndex = guild.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return false;
        const adv = guild.adventurers[advIndex];

        // 1. Force Retire logic
        // Remove from active list
        guild.adventurers.splice(advIndex, 1);

        // Add to retired list (set reason to 'APPOINTMENT')
        const retiredData = {
            ...adv,
            leftDay: guild.day,
            reason: 'RETIRE' // Use 'RETIRE' standard type
        };

        if (!guild.retiredAdventurers) guild.retiredAdventurers = [];
        guild.retiredAdventurers.push(retiredData);

        // Add history log
        if (!retiredData.history) retiredData.history = [];
        retiredData.history.push({ day: guild.day, text: 'ギルド顧問に任命され、現役を引退。' });

        this.uiManager.log(`${adv.name} は現役を引退し、顧問に就任しました。`, 'success');

        // 2. Hire as Advisor
        const candidateData = {
            id: adv.id,
            name: adv.name,
            type: adv.type,
            rankLabel: adv.rankLabel,
            stats: adv.stats,
            roleName: '顧問',
            bio: adv.bio,
            origin: adv.origin,
            history: adv.history // Pass reference or copy? Reference is fine as they are now same entity in lore
        };

        return this.hireAdvisor(guild, candidateData);
    }

    // No firing
    // 解雇不可 (ユーザー要望)
    fireAdvisor(guild, advisorId) {
        return false;
    }

    // Helper to get total modifiers
    // 合計補正値を取得するヘルパー
    getGlobalModifiers(guild) {
        const mods = { ...POLICIES[guild.activePolicy].mod }; // Copy policy mods
        // 方針補正をコピー

        // Add Advisor mods
        // 顧問補正を追加
        // Add Advisor mods (Diminishing returns for duplicate jobs)
        // 顧問補正 (同職の重複減衰)
        const jobCounts = {};
        guild.advisors.forEach(adv => {
            const eff = adv.effect;
            const typeKey = adv.type;

            jobCounts[typeKey] = (jobCounts[typeKey] || 0) + 1;
            const count = jobCounts[typeKey]; // 1-based index (1st, 2nd...)

            // Diminishing factor: 1.0, 0.5, 0.25... (1 / 2^(n-1))
            const factor = 1 / Math.pow(2, count - 1);

            // Updated logic for new simple object format { key: val, ... }
            // e.g. { power: 0.04 }, { injury: 0.96 }
            // Some are additive (e.g. power, success), some are multiplicative (e.g. injury, reward)?
            // Actually, let's treat logical flow:
            // - Rates (success, power) are additive (+4%)
            // - Multipliers (injury, reward, fame, growth, penalty) are multiplicative (x0.96, x1.05)?
            //   Wait, previous Policy logic used multipliers for reward/injury.
            //   But User request says "Success Rate +2%". This is additive to probability (0.8 + 0.02).
            //   "Reward +5%". This is multiplier (Base * 1.05).
            //   "Injury Rate -4%". This is reduction. If base is 1.0 multiplier, 0.96.

            // Let's decide based on KEY:
            // ADDITIVE: power, success
            // MULTIPLICATIVE: injury, penalty, growth, fame, reward

            // Wait, for Multiplicative, how do we handle diminishing returns on the *factor*?
            // e.g. Reward +5% (1.05). Second one is +2.5% (1.025).
            // Formula: NewMult = 1 + (BaseMult - 1) * factor
            // e.g. 1.05 -> (0.05 * 1.0) + 1 = 1.05.
            // e.g. 1.05 second time -> (0.05 * 0.5) + 1 = 1.025.

            const ADDITIVE_KEYS = ['power', 'success'];

            // eff is the whole object { power: 0.04, desc: ... } or old style { type:..., val:... }
            // With new constant update, it is { power: 0.04, desc: ... }
            // But we need to handle potential legacy or direct access.

            let effects = eff;
            if (eff.type && eff.val) {
                // Check if legacy style (shouldn't happen with new constants but safe to keep?)
                // Skip legacy normalization for now as we just replaced constants.
                effects = typeof eff.val === 'object' ? eff.val : { [eff.type]: eff.val };
            }

            for (const [k, v] of Object.entries(effects)) {
                if (k === 'desc' || k === 'type') continue;

                if (ADDITIVE_KEYS.includes(k)) {
                    // Additive: simply add (val * factor)
                    mods[k] = (mods[k] || 0) + (v * factor);
                } else {
                    // Multiplicative: (val - 1) * factor + 1
                    // e.g. 0.96 (-4%) -> -0.04 * factor -> result + 1.
                    // If mods[k] is undefined, start at 1.0.
                    // We need to accumulate multipliers.
                    // Total = Base * M1 * M2...
                    // So we multiply into the existing mod.

                    const baseDiff = v - 1.0;
                    const effectiveDiff = baseDiff * factor;
                    const effectiveMult = 1.0 + effectiveDiff;

                    mods[k] = (mods[k] || 1.0) * effectiveMult;
                }
            }
        });

        // Add Event mods
        // イベント補正を追加
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
