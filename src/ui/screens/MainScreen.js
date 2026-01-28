export class MainScreen {
    constructor() {
        // No dependency on Renderer needed if logs are passed in
    }

    render(container, guild, state, logs = []) {
        // Layout: 2 columns (Summary / Notifications)
        container.classList.add('grid-2-col-even');

        // 0. Management Status (New)
        const mgmtPanel = document.createElement('section');
        mgmtPanel.className = 'panel mb-md';
        mgmtPanel.innerHTML = `<h2>現在の運営状況</h2>`;

        const mgmtContent = document.createElement('div');
        mgmtContent.className = 'text-sm';

        // Active Policy
        const pName = { BALANCED: '標準', AGGRESSIVE: '利益追求', SAFE: '安全第一', TRAINING: '新人育成', COMMERCIAL: '商業振興' };
        const policyName = pName[guild.activePolicy] || guild.activePolicy;

        // Active Events
        let eventHtml = '<span style="color:#9e9e9e;">特になし</span>';
        if (guild.activeEvents && guild.activeEvents.length > 0) {
            eventHtml = guild.activeEvents.map(evt => {
                let modStr = [];
                if (evt.mod) {
                    for (const [k, v] of Object.entries(evt.mod)) {
                        modStr.push(`${k} x${v}`);
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

        // Modify Grid Layout logic a bit? 
        // We want Summary + Mgmt on Left, Log on Right.

        const leftCol = document.createElement('div');
        leftCol.className = 'flex-col gap-md';

        leftCol.appendChild(mgmtPanel);

        // 1. Summary Panel (Existing)
        const summaryPanel = document.createElement('section');
        summaryPanel.className = 'panel summary-panel';
        summaryPanel.innerHTML = `<h2>ギルド人員状況</h2>`;

        const stats = document.createElement('div');
        stats.className = 'summary-stats';

        // Count statuses
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

        // 2. Notification Panel (Log)
        const logPanel = document.createElement('section');
        logPanel.className = 'panel log-panel';
        logPanel.innerHTML = `<h2>通知</h2>`;

        const logContainer = document.createElement('div');
        logContainer.id = 'log-container-main';
        logContainer.className = 'log-list';

        // Render Logs from array
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
