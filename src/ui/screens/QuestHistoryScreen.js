export class QuestHistoryScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.state = {
            currentPage: 0,
            selectedHistoryId: null
        };
        this.ITEMS_PER_PAGE = 100;
    }

    render(container, guild, globalState) {
        container.innerHTML = '';
        container.className = 'screen-container';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1.3fr 1fr';
        container.style.gap = '1.5rem';

        // --- Left: History List ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel';
        listPanel.style.padding = '0.5rem';
        listPanel.style.display = 'flex';
        listPanel.style.flexDirection = 'column';

        // Header
        const header = document.createElement('div');
        header.className = 'list-header';
        header.textContent = '依頼履歴';
        listPanel.appendChild(header);

        // List Container
        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list';
        listContainer.id = 'history-list-container'; // Add ID for easier access if needed
        listContainer.style.flex = '1';

        const history = this.gameLoop.questHistory || [];
        const totalPages = Math.ceil(history.length / this.ITEMS_PER_PAGE) || 1;

        // Clamp page
        if (this.state.currentPage >= totalPages) this.state.currentPage = totalPages - 1;
        if (this.state.currentPage < 0) this.state.currentPage = 0;

        const startIdx = this.state.currentPage * this.ITEMS_PER_PAGE;
        const endIdx = startIdx + this.ITEMS_PER_PAGE;
        const displayItems = history.slice(startIdx, endIdx);

        if (displayItems.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = '履歴はありません';
            empty.style.color = '#777';
            empty.style.textAlign = 'center';
            empty.style.padding = '2rem';
            listContainer.appendChild(empty);
        } else {
            displayItems.forEach(item => {
                const el = this._createHistoryItem(item);
                el.onclick = () => {
                    // Capture scroll position
                    const currentScroll = listContainer.scrollTop;
                    this.state.selectedHistoryId = item.id;
                    this.state.lastScrollTop = currentScroll; // Store in state
                    this.render(container, guild, globalState);
                };
                listContainer.appendChild(el);
            });
        }

        // Restore scroll position if available
        if (typeof this.state.lastScrollTop !== 'undefined') {
            // Use setTimeout to ensure DOM is rendered (though synchronous append usually works, safer with 0 timeout or just direct set)
            // But since we just collected elements, they are not yet in DOM until listPanel is appended? 
            // Actually listContainer IS appended to listPanel below, but listPanel is not in container yet.
            // We can set it immediately after this block.
        }

        listPanel.appendChild(listContainer);



        // Pagination Controls
        const pagination = document.createElement('div');
        pagination.style.display = 'flex';
        pagination.style.justifyContent = 'space-between';
        pagination.style.padding = '0.5rem';
        pagination.style.borderTop = '1px solid #d7ccc8';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-secondary'; // Matched style
        prevBtn.style.padding = '0.2rem 0.5rem';
        prevBtn.style.width = 'auto';
        prevBtn.textContent = '<< 前へ';
        prevBtn.disabled = this.state.currentPage === 0;
        prevBtn.onclick = () => {
            this.state.currentPage--;
            this.render(container, guild, globalState);
        };

        const pageLabel = document.createElement('span');
        pageLabel.className = 'text-meta'; // Matched style
        pageLabel.textContent = `Page ${this.state.currentPage + 1} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-secondary'; // Matched style
        nextBtn.style.padding = '0.2rem 0.5rem';
        nextBtn.style.width = 'auto';
        nextBtn.textContent = '次へ >>';
        nextBtn.disabled = this.state.currentPage >= totalPages - 1;
        nextBtn.onclick = () => {
            this.state.currentPage++;
            this.render(container, guild, globalState);
        };

        pagination.appendChild(prevBtn);
        pagination.appendChild(pageLabel);
        pagination.appendChild(nextBtn);
        listPanel.appendChild(pagination);

        container.appendChild(listPanel);


        // --- Right: Details ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel';
        detailPanel.style.background = '#fdf5e6';

        const selectedItem = history.find(h => h.id === this.state.selectedHistoryId);

        if (selectedItem) {
            this._renderDetail(detailPanel, selectedItem);
        } else {
            detailPanel.innerHTML = `
                <div style="text-align:center; margin-top:50%; transform:translateY(-50%); color:#8d6e63;">
                    <div style="font-size:3rem; opacity:0.3;">📜</div>
                    <p>履歴を選択してください</p>
                </div>
            `;
        }

        container.appendChild(detailPanel);

        // Restore Scroll (Must be done after elements are in DOM to have layout/height)
        if (typeof this.state.lastScrollTop !== 'undefined') {
            const listEl = container.querySelector('#history-list-container');
            if (listEl) {
                listEl.scrollTop = this.state.lastScrollTop;
            }
        }
    }

    _createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'list-item';
        if (this.state.selectedHistoryId === item.id) {
            div.className += ' selected';
        }

        let statusColor = '#757575'; // Expired/Unknown
        let statusText = '終了';
        if (item.result === 'SUCCESS') {
            statusColor = '#2e7d32'; // Green
            statusText = '成功';
        } else if (item.result === 'FAILURE') {
            statusColor = '#c62828'; // Red
            statusText = '失敗';
        } else if (item.result === 'EXPIRED') {
            statusColor = '#ef6c00'; // Orange
            statusText = '期限切れ';
        }

        const specialBadge = item.isSpecial ? '<span class="status-badge" style="background:#263238; color:#efebe9;">特務</span> ' : '';

        div.innerHTML = `
            <div class="list-item-header">
                ${specialBadge}
                <span class="list-item-title">${item.title}</span>
            </div>
            <div class="list-item-meta">
                <span style="font-weight:bold; color:${statusColor};">${statusText}</span>
                <span style="color:#777;">Day ${item.date}</span>
                <span class="status-badge" style="background:#efebe9; border:1px solid #d7ccc8;">Rank ${item.rank}</span>
            </div>
        `;
        return div;
    }

    _renderDetail(panel, item) {
        panel.innerHTML = `<div class="panel-header">${item.title}</div>`;

        let resultLabel = '';
        if (item.result === 'SUCCESS') resultLabel = '<span style="color:#2e7d32; font-weight:bold;">依頼達成</span>';
        else if (item.result === 'FAILURE') resultLabel = '<span style="color:#c62828; font-weight:bold;">依頼失敗</span>';
        else resultLabel = '<span style="color:#ef6c00; font-weight:bold;">期限切れ</span>';

        panel.innerHTML += `
            <div style="margin-bottom:1rem;">
                ${resultLabel}
                <span style="margin-left:10px;">完了日: Day ${item.date}</span>
            </div>
            <div class="text-base text-sub" style="margin-bottom:0.8rem; font-style:italic;">
                ${item.description || "詳細不明"}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;" class="text-base text-sub">
                <div>ランク: <b>${item.rank}</b></div>
                <div>参加: ${item.members.length > 0 ? item.members.length + '人' : 'なし'}</div>
            </div>
            <br>
        `;

        if (item.result !== 'EXPIRED') {
            panel.innerHTML += `
                <div style="background:#efebe9; padding:0.8rem; border-radius:4px; border:1px solid #d7ccc8;" class="text-base">
                    <b>報酬:</b> ${item.reward.money}G / 評判 ${item.reward.reputation > 0 ? '+' : ''}${item.reward.reputation}
                </div>
                <div style="margin-top:0.5rem;">
                    <b>担当者:</b> ${item.members.join(', ')}
                </div>
            `;
        }

        // Narrative Log Area
        panel.innerHTML += `<div class="sub-header" style="margin-top:1.5rem;">冒険日誌</div>`;
        const logArea = document.createElement('div');
        logArea.style.background = '#fff';
        logArea.style.border = '1px solid #d7ccc8';
        logArea.style.padding = '0.5rem';
        logArea.style.height = '200px';
        logArea.style.overflowY = 'auto';
        logArea.style.fontSize = '0.9em';
        logArea.style.color = '#3e2723';
        logArea.style.whiteSpace = 'pre-wrap';
        logArea.style.fontFamily = 'serif';

        if (item.logs && item.logs.length > 0) {
            logArea.textContent = this._formatLogs(item.logs);
        } else {
            logArea.textContent = '記録なし';
        }

        panel.appendChild(logArea);
    }

    _formatLogs(dailyLogs) {
        // Placeholder for poetic narrative
        // dailyLogs is array of { day: N, logs: [strings] }
        // We will just flatten them for now, but in a "story" format.
        let text = "";

        dailyLogs.forEach(d => {
            text += `【Day ${d.day}】\n`;
            d.logs.forEach(l => {
                // Determine icon based on log content simply
                let icon = '';
                if (l.includes('戦闘')) icon = '⚔️ ';
                else if (l.includes('採取') || l.includes('発見')) icon = '🌿 ';
                else if (l.includes('休息') || l.includes('食事')) icon = '⛺ ';

                // Add some flavor prefix logic here later
                text += `${icon}${l}\n`;
            });
            text += `\n`;
        });

        // Add intro/outro based on result
        // if success... "彼らは無事に帰還した。"
        return text;
    }
}
