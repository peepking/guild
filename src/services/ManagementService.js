
import { POLICIES, ADVISOR_ROLES, RANDOM_EVENTS, FACILITIES } from '../data/ManagementData.js';
import { CONSTANTS } from '../data/constants.js';

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
        // 1. Pay Salaries
        // 1. 給与支払い
        this._payAdvisorSalaries(guild);

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

        // Shop Income: 2G * Lv * Count
        // 売店収益: 2G * Lv * Count
        const shopLv = (guild.facilities && guild.facilities.shop) || 0;
        if (shopLv > 0) {
            const income = 2 * shopLv * advCount;
            totalIncome += income;
            details.push({ reason: `売店売上 (Lv.${shopLv})`, amount: income });
        }

        // Tavern Income: 3G * Lv * Count
        // 酒場収益: 3G * Lv * Count
        const tavernLv = (guild.facilities && guild.facilities.tavern) || 0;
        if (tavernLv > 0) {
            const income = 3 * tavernLv * advCount;
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
                // 財務ログ?
                if (guild.todayFinance) {
                    guild.todayFinance.expense += totalSalary;
                    guild.todayFinance.balance = guild.money;
                    guild.todayFinance.details.push({ reason: '顧問給与', amount: -totalSalary });
                }
            } else {
                // Cant pay? Fire someone? Or debt? 
                // Simple: Debt / Warning.
                // 支払い不能? 解雇? 借金? -> 警告のみ
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
    checkAndAddCandidate(guild, adventurer) {
        // Must be Retired or Leaving peacefully? 
        // Logic in GameLoop handles "RETIRE" vs "LEAVE".
        // Threshold: Rank value > 400 (roughly B middle)?
        // 引退または円満退社が必要。GameLoopのロジックで処理。
        // 閾値: ランク値 > 400 (B中盤)?
        if (adventurer.rankValue < 480) return; // Must be B rank (480+)

        // Determine role based on highest stat
        // 最大ステータスに基づいて役割を決定
        const role = this._determineAdvisorRole(adventurer.stats);
        if (!role) return;

        // Salary based on Rank
        // ランクに基づく給与
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
        // 最大ステータスを検索
        let maxVal = -1;
        let bestStat = null;
        for (const [k, v] of Object.entries(stats)) {
            if (v > maxVal) {
                maxVal = v;
                bestStat = k;
            }
        }

        // Find role matching stat
        // ステータスに一致する役割を検索
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
        // 枠制限? 最初は1。施設拡張で増加可能。
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
        // 候補に戻す? それとも永久に去る? 解雇なら永久欠番がリアル。
        this.uiManager.log(`${advisor.name} との顧問契約を解除しました。`, 'info');
        return true;
    }

    // Helper to get total modifiers
    // 合計補正値を取得するヘルパー
    getGlobalModifiers(guild) {
        const mods = { ...POLICIES[guild.activePolicy].mod }; // Copy policy mods
        // 方針補正をコピー

        // Add Advisor mods
        // 顧問補正を追加
        guild.advisors.forEach(adv => {
            const eff = adv.effect;
            for (const [k, v] of Object.entries(eff)) {
                // Multiplicative or additive?
                // Let's go multiplicative for rates, additive for flat?
                // Most are rates (1.1, etc). Multiply.
                // 乗算か加算か? レートは乗算、固定値は加算? 大半はレート。乗算で。
                mods[k] = (mods[k] || 1.0) * v;
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
