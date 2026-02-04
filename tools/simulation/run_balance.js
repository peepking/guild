
import { HeadlessGame } from './HeadlessGame.js';
import { BeginnerAI, MinMaxerAI, ContrarianAI, RestrictionAI, HastyAI } from './AIController.js';
import { MetricsCollector } from './MetricsCollector.js';
import fs from 'fs';
import path from 'path';

const SIM_DAYS = 500;
const OUTPUT_FILE = 'balance_report.md';

console.log("Starting Balance Simulation...");

const ais = [
    { class: BeginnerAI, name: 'Beginner (初心者)' },
    { class: MinMaxerAI, name: 'Min-Maxer (ビルド厨)' },
    { class: ContrarianAI, name: 'Contrarian (逆張り)' },
    { class: RestrictionAI, name: 'Restriction (縛り勢)' },
    { class: HastyAI, name: 'Hasty (せっかち)' }
];

let report = "# バランス調整シミュレーションレポート\n作成日時: " + new Date().toLocaleString('ja-JP') + "\n\n";

async function runSim(AIClass, name) {
    console.log(`Running simulation for: ${name}...`);

    const game = new HeadlessGame();
    // Monkey Patch _handleQuestResult for debugging (Removed)

    // const originalHandleResult = game.gameLoop._handleQuestResult;
    // ... removed ...

    const ai = new AIClass(game);
    const metrics = new MetricsCollector(name);

    // Simulate
    for (let day = 1; day <= SIM_DAYS; day++) {
        // 1. Day Start Phase
        ai.onDayStart();

        // 2. Assign Phase

        // Debug Check Planned before step
        if (game.gameLoop.plannedQuests.length > 0) {
            console.log(`[FLOW] Day ${day} Start (Before Step): Planned=${game.gameLoop.plannedQuests.length}`);
        }

        game.step(); // Advances day, generates quests for *next* day

        // Debug Check Ongoing after step
        if (game.gameLoop.ongoingQuests.length > 0) {
            console.log(`[FLOW] Day ${day} End (After Step): Ongoing=${game.gameLoop.ongoingQuests.length}`);
        } else if (day % 50 === 0) {
            console.log(`[FLOW] Day ${day} End: No Ongoing Quests! Active=${game.gameLoop.activeQuests.length}`);
        }

        // Return auto-planned to active pool for AI decision
        // IMPORTANT: cancel auto-assignments to release adventurers back to IDLE
        if (game.gameLoop.plannedQuests.length > 0) {
            const plannedCopy = [...game.gameLoop.plannedQuests];
            for (const plan of plannedCopy) {
                game.gameLoop.assignmentService.cancelAssignment(
                    plan,
                    game.gameLoop.ongoingQuests,
                    game.gameLoop.plannedQuests
                );
                game.gameLoop.activeQuests.push(plan.quest);
            }
            game.gameLoop.plannedQuests = [];
        }

        // AI Selection
        const selectedIds = ai.onQuestSelection();
        for (const qId of selectedIds) {
            const q = game.gameLoop.activeQuests.find(quest => quest.id === qId);
            if (q) {
                const result = game.gameLoop.assignmentService.suggestBestParty(q, game.guild.adventurers.filter(a => a.isAvailable()));

                if (result) {
                    game.gameLoop.plannedQuests.push(result);
                    // Remove from active
                    const idx = game.gameLoop.activeQuests.findIndex(quest => quest.id === q.id);
                    if (idx !== -1) {
                        game.gameLoop.activeQuests.splice(idx, 1);
                    } else {
                        console.log(`[WARN] Failed to remove ${q.id} from active!`);
                    }

                    if (result.members) {
                        result.members.forEach(m => m._tempBusy = true);
                    }
                    console.log(`[FLOW] Pushed to Planned: ${q.title}`);
                }
            }
        }

        // Cleanup temp busy
        game.guild.adventurers.forEach(a => delete a._tempBusy);

        // CONFIRM ASSIGNMENTS
        if (game.gameLoop.plannedQuests.length > 0) {
            game.gameLoop.assignmentService.confirmAssignments(game.gameLoop.plannedQuests, game.gameLoop.ongoingQuests);
            game.gameLoop.plannedQuests = [];
        }

        // End of day logic
        metrics.onDayEnd(game, ai);
    }

    report += metrics.getReport();
    report += "\n---\n";
}

// Execution
(async () => {
    for (const entry of ais) {
        try {
            await runSim(entry.class, entry.name);
        } catch (e) {
            console.error(`Error in ${entry.name}:`, e);
            report += `\n### エラー (${entry.name})\n${e.message}\n`;
        }
    }

    fs.writeFileSync(OUTPUT_FILE, report);
    console.log(`Report generated: ${OUTPUT_FILE}`);
})();
