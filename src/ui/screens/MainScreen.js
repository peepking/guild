import { GUILD_RANK_THRESHOLDS } from '../../data/constants.js';
import { EFFECT_LABELS } from '../../data/ManagementData.js';

export class MainScreen {
    constructor() {
        // ログが渡される場合、Rendererへの依存は不要
    }

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
        const pName = { BALANCED: '標準', AGGRESSIVE: '利益追求', SAFE: '安全第一', TRAINING: '新人育成', COMMERCIAL: '商業振興' };
        const policyName = pName[guild.activePolicy] || guild.activePolicy;

        // 発生中のイベント
        let eventHtml = '<span style="color:#9e9e9e;">特になし</span>';
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
            <div style="margin-bottom:0.5rem;">
                <strong>ギルドランク:</strong> ${(() => {
                const r = GUILD_RANK_THRESHOLDS.find(r => guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
                return `<span class="text-status-safe">${r.name}</span> (Rank ${r.label})`;
            })()}
            </div>
            <div style="margin-bottom:0.5rem;">
                <strong>現在の方針:</strong> ${policyName}
            </div>
            <div style="margin-bottom:0.5rem;">
                <strong>発生中のイベント:</strong><br>
                ${eventHtml}
            </div>
            <div style="margin-bottom:0.5rem; font-size:0.85em; color:#666;">
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
            <div class="summary-item"><span>準備中</span><span class="${planning > 0 ? 'text-status-safe' : ''}">${planning}名</span></div>
            <div class="summary-item"><span>遠征中</span><span>${questing}名</span></div>
            <div class="summary-item"><span>療養中</span><span class="${injured > 0 ? 'text-status-danger' : ''}">${injured}名</span></div>
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
