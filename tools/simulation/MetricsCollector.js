
import { GUILD_RANK_THRESHOLDS } from '../../src/data/constants.js';

export class MetricsCollector {
    constructor(aiName) {
        this.aiName = aiName;
        this.funMoments = [];
        this.stressMoments = [];
        this.unfairMoments = [];
        this.confusionMoments = [];

        // stats
        this.maxMoney = 0;
        this.currentMoney = 0;
        this.reputation = 0;
        this.rank = 'E';
        this.advCount = 0;
        this.facilityLv = [];
        this.advisorCount = 0;

        this.totalQuests = 0;
        this.totalFailures = 0;
        this.rankHistory = [];
        this.deadAdventurers = 0;
    }

    onDayEnd(game, ai) {
        const g = game.guild;
        const day = g.day;

        // Snapshot stats
        this.currentMoney = g.money;
        this.reputation = g.reputation;
        this.advCount = g.adventurers.length;
        this.advisorCount = g.advisors.length;
        this.facilityLv = Object.entries(g.facilities || {}).map(([k, v]) => `${k}:${v}`);

        // Rank logic
        const rankObj = GUILD_RANK_THRESHOLDS.find(r => g.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        this.rank = rankObj.label;


        // 1. Fun Moments Checks
        // - Rank Up
        if (g.highestRankThreshold > (this._lastRankThreshold || 0)) {
            if (this._lastRankThreshold !== undefined) {
                // Find label
                this.funMoments.push({ day, type: 'RANK_UP', desc: `Rank increased (Threshold: ${g.highestRankThreshold})` });
            }
            this._lastRankThreshold = g.highestRankThreshold;
        }

        // - Big Money (income > 1000 in a day)
        if (g.todayFinance && g.todayFinance.income > 100) {
            this.funMoments.push({ day, type: 'BIG_INCOME', desc: `Earned ${g.todayFinance.income}G` });
        }

        // - Rare Drop (Scanner logs? or check inventory size increase? tough.)
        // Check logs for "奥義" (Ultimate Arts) or "Sランク"
        const currentLogCount = game.uiManager.logs.length;
        const dailyLogs = game.uiManager.logs.slice(this._lastLogCount || 0);
        this._lastLogCount = currentLogCount;

        for (const l of dailyLogs) {
            if (l.message.includes('天下一武闘会') && l.message.includes('優勝')) {
                this.funMoments.push({ day, type: 'TOURNAMENT_WIN', desc: l.message });
            }
            if (l.message.includes('奥義')) {
                this.funMoments.push({ day, type: 'ULTIMATE_ART', desc: l.message });
            }
        }

        // 2. Stress Moments Checks
        // - Death
        if (g.retiredAdventurers.some(a => a.leftDay === day && a.reason === 'DEATH')) {
            this.stressMoments.push({ day, type: 'DEATH', desc: 'Adventurer died' });
            this.deadAdventurers++;
        }

        // - Bankruptcy Warning
        if (g.money < 0) {
            this.stressMoments.push({ day, type: 'DEBT', desc: `Debt: ${g.money}G` });
        }

        // - Consecutive Failures
        // Check quest history for today
        const todaysQuests = game.gameLoop.questHistory.filter(q => q.date === day);
        const failures = todaysQuests.filter(q => q.result === 'FAILURE');
        if (failures.length >= 2) {
            this.stressMoments.push({ day, type: 'FAIL_STREAK', desc: `${failures.length} quests failed today` });
        }

        // 3. Unfairness
        // High winrate fail
        for (const f of failures) {
            // We don't have the winrate stored in history easily, unless we stored it.
            // But we can guess if rank was low compared to party?
            // Or logs?
            // Let's assume unfair if "95%" was in the log? No logs don't show % usually.
            // We can assume Unfair if success was expected by AI.
            // AI knows it picked high winrate.
            if (ai.name === 'Beginner') {
                // Beginner only picks > 90%. If it failed, it's unfair.
                this.unfairMoments.push({ day, type: 'RNG_BS', desc: `Beginner AI failed a quest (presumably high %)` });
            }
        }

        // 4. Confusion
        // If AI skipped valid quests?
        // Hard to track without AI explicit signal.
        // Hasty AI might skip.

        // Stats
        if (g.money > this.maxMoney) this.maxMoney = g.money;
        this.totalQuests += todaysQuests.length;
        this.totalFailures += failures.length;
    }

    getReport() {
        return `
### AI: ${this.aiName}
- **生存日数**: 500
- **最終資金**: ${this.currentMoney}G
- **最終ランク**: ${this.rank} (名声: ${this.reputation})
- **冒険者数**: ${this.advCount}名
- **顧問数**: ${this.advisorCount}名
- **施設**: ${this.facilityLv.join(', ')}
- **クエスト総数**: ${this.totalQuests} (失敗: ${this.totalFailures} - ${(this.totalFailures > 0 ? (this.totalFailures / this.totalQuests * 100).toFixed(1) : 0)}%)
- **死亡者数**: ${this.deadAdventurers}

#### 楽しかった瞬間 (Top 3)
${this._top3(this.funMoments)}

#### ストレスを感じた瞬間 (Top 3)
${this._top3(this.stressMoments)}

#### 理不尽を感じた瞬間
${this._top3(this.unfairMoments)}

#### 総評 (Analysis)
- **1日あたりの平均収入**: ${Math.floor((this.currentMoney - 1000) / 500)}G
- **クエスト効率**: ${(this.currentMoney / Math.max(1, this.totalQuests)).toFixed(1)} G/回
- **コメント**: ${this._generateComment()}
        `;
    }

    _generateComment() {
        const dailyIncome = (this.currentMoney - 1000) / 500;

        if (this.deadAdventurers > 0) return "死者が出ており、運用に改善の余地があります。";
        if (this.currentMoney < 1500) return "資金難に陥っています。施設投資やクエスト選定を見直すべきかもしれません。";
        if (dailyIncome > 100) return "極めて順調な黒字経営です。";
        return "安定した運営ができていますが、さらなる飛躍も可能です。";
    }

    _top3(arr) {
        if (arr.length === 0) return "なし";
        return arr.slice(0, 3).map(x => `- ${x.day}日目: [${x.type}] ${x.desc}`).join('\n');
    }
}
