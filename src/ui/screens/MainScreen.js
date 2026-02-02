import { GUILD_RANK_THRESHOLDS } from '../../data/constants.js';
import { EFFECT_LABELS } from '../../data/ManagementData.js';
import { UI_CONSTANTS } from '../../data/ui_constants.js';

/**
 * メイン画面（ダッシュボード）クラス
 */
export class MainScreen {
    /**
     * コンストラクタ
     */
    constructor() {
        // ログが渡される場合、Rendererへの依存は不要
    }

    /**
     * 画面を描画します。
     * @param {HTMLElement} container - 描画対象コンテナ
     * @param {object} guild - ギルドデータ
     * @param {object} state - UI状態
     * @param {Array} logs - ログ配列
     */
    render(container, guild, state, logs = []) {
        // レイアウト: 2カラム (サマリー / 通知)
        container.classList.add('grid-2-col-even');

        // 0. 運営状況 (新規)
        const mgmtPanel = document.createElement('section');
        mgmtPanel.className = 'panel mb-md';
        mgmtPanel.innerHTML = `<h2>現在の運営状況</h2>`;

        const mgmtContent = document.createElement('div');
        mgmtContent.className = 'text-sm';

        // 現在の方針
        const policyName = UI_CONSTANTS.POLICY_LABELS[guild.activePolicy] || guild.activePolicy;

        // 発生中のイベント
        let eventHtml = `<span class="${UI_CONSTANTS.CLASSES.SUB_TEXT}">${UI_CONSTANTS.MESSAGES.EMPTY_STATE}</span>`;
        if (guild.activeEvents && guild.activeEvents.length > 0) {
            eventHtml = guild.activeEvents.map(evt => {
                let modStr = [];
                if (evt.mod) {
                    for (const [k, v] of Object.entries(evt.mod)) {
                        modStr.push(`${EFFECT_LABELS[k] || k} x${v}`);
                    }
                }
                return `
                    <div class="event-card-warning">
                        <div class="text-event-title">${evt.name} (残り${evt.remainingDays}日)</div>
                        <div class="text-event-desc">${evt.description}</div>
                        <div class="text-event-meta">効果: ${modStr.join(', ')}</div>
                    </div>
                `;
            }).join('');
        }

        mgmtContent.innerHTML = `
            <div class="mb-sm">
                <strong>ギルドランク:</strong> ${(() => {
                const r = GUILD_RANK_THRESHOLDS.find(r => guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
                return `<span class="${UI_CONSTANTS.CLASSES.SAFE}">${r.name}</span> (Rank ${r.label})`;
            })()}
            </div>
            <div class="mb-sm">
                <strong>現在の方針:</strong> ${policyName}
            </div>
            <div class="mb-sm">
                <strong>発生中のイベント:</strong><br>
                ${eventHtml}
            </div>
            <div class="mb-sm text-sm text-meta">
                ※運営方針やイベントの詳細は「運営」メニューで確認・変更できます。
            </div>
        `;
        mgmtPanel.appendChild(mgmtContent);

        // グリッドレイアウトロジックを修正
        // 左側にサマリーと運営状況、右側にログを配置したい

        const leftCol = document.createElement('div');
        leftCol.className = 'flex-col gap-md';

        leftCol.appendChild(mgmtPanel);

        // 1. サマリーパネル (既存)
        const summaryPanel = document.createElement('section');
        summaryPanel.className = 'panel summary-panel';
        summaryPanel.innerHTML = `<h2>ギルド人員状況</h2>`;

        const stats = document.createElement('div');
        stats.className = 'summary-stats';

        // ステータスカウント
        const idle = guild.adventurers.filter(a => a.state === 'IDLE' && a.recoveryDays <= 0).length;
        const planning = guild.adventurers.filter(a => a.state === 'PLANNING').length;
        const questing = guild.adventurers.filter(a => a.state === 'QUESTING').length;
        const injured = guild.adventurers.filter(a => a.recoveryDays > 0).length;

        stats.innerHTML = `
            <div class="summary-item"><span>所属冒険者</span><span>${guild.adventurers.length}名</span></div>
            <div class="summary-item"><span>待機中</span><span>${idle}名</span></div>
            <div class="summary-item"><span>準備中</span><span class="${planning > 0 ? UI_CONSTANTS.CLASSES.SAFE : ''}">${planning}名</span></div>
            <div class="summary-item"><span>遠征中</span><span>${questing}名</span></div>
            <div class="summary-item"><span>療養中</span><span class="${injured > 0 ? UI_CONSTANTS.CLASSES.DANGER : ''}">${injured}名</span></div>
        `;
        summaryPanel.appendChild(stats);
        leftCol.appendChild(summaryPanel);

        container.appendChild(leftCol);

        // 2. 通知パネル (ログ)
        const logPanel = document.createElement('section');
        logPanel.className = 'panel log-panel';
        logPanel.innerHTML = `<h2>通知</h2>`;

        const logContainer = document.createElement('div');
        logContainer.id = 'log-container-main';
        logContainer.className = 'log-list';

        // 配列からログを描画
        logs.forEach(log => {
            const entry = document.createElement('div');
            entry.className = `log-entry ${log.type}`;
            entry.textContent = log.message;
            logContainer.appendChild(entry);
        });

        logPanel.appendChild(logContainer);
        container.appendChild(logPanel);
    }
}
