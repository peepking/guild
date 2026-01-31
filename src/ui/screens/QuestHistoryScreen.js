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

        // --- 左: 履歴リスト ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel';
        listPanel.style.padding = '0.5rem';
        listPanel.style.display = 'flex';
        listPanel.style.flexDirection = 'column';

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'list-header';
        header.textContent = '依頼履歴';
        listPanel.appendChild(header);

        // リストコンテナ
        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list';
        listContainer.id = 'history-list-container'; // 必要に応じてアクセスしやすくするID
        listContainer.style.flex = '1';

        const history = this.gameLoop.questHistory || [];
        const totalPages = Math.ceil(history.length / this.ITEMS_PER_PAGE) || 1;

        // ページ修正
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
                    // スクロール位置の保持
                    const currentScroll = listContainer.scrollTop;
                    this.state.selectedHistoryId = item.id;
                    this.state.lastScrollTop = currentScroll; // ステートに保存
                    this.render(container, guild, globalState);
                };
                listContainer.appendChild(el);
            });
        }

        // スクロール位置の復元 (存在する場合)
        if (typeof this.state.lastScrollTop !== 'undefined') {
            // setTimeoutを使用してDOMが描画されたことを確認する (同期appendは通常機能するが、0タイムアウトの方が安全)
            // ListItemsを収集した直後だが、listPanelはまだコンテナに追加されていない。
        }

        listPanel.appendChild(listContainer);



        // ページネーション制御
        const pagination = document.createElement('div');
        pagination.style.display = 'flex';
        pagination.style.justifyContent = 'space-between';
        pagination.style.padding = '0.5rem';
        pagination.style.borderTop = '1px solid #d7ccc8';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-secondary'; // スタイル合わせ
        prevBtn.style.padding = '0.2rem 0.5rem';
        prevBtn.style.width = 'auto';
        prevBtn.textContent = '<< 前へ';
        prevBtn.disabled = this.state.currentPage === 0;
        prevBtn.onclick = () => {
            this.state.currentPage--;
            this.render(container, guild, globalState);
        };

        const pageLabel = document.createElement('span');
        pageLabel.className = 'text-meta'; // スタイル合わせ
        pageLabel.textContent = `Page ${this.state.currentPage + 1} / ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-secondary'; // スタイル合わせ
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


        // --- 右: 詳細 ---
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

        // スクロール復元 (要素がDOMに配置され、レイアウト/高さが確定した後に行う)
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

        let statusColor = '#757575'; // 期限切れ/不明
        let statusText = '終了';
        if (item.result === 'SUCCESS') {
            statusColor = '#2e7d32'; // 緑
            statusText = '成功';
        } else if (item.result === 'FAILURE') {
            statusColor = '#c62828'; // 赤
            statusText = '失敗';
        } else if (item.result === 'EXPIRED') {
            statusColor = '#ef6c00'; // オレンジ
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

        // 冒険日誌エリア
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
        // 詩的な冒険日誌のためのプレースホルダー
        // dailyLogsは { day: N, logs: [strings] } の配列
        // 現状はフラット化して表示するが、将来的には「物語」形式にする
        let text = "";

        dailyLogs.forEach(d => {
            text += `【Day ${d.day}】\n`;
            d.logs.forEach(l => {
                // ログ内容に基づいてアイコンを簡易決定
                let icon = '';
                if (l.includes('戦闘')) icon = '⚔️ ';
                else if (l.includes('採取') || l.includes('発見')) icon = '🌿 ';
                else if (l.includes('休息') || l.includes('食事')) icon = '⛺ ';

                // ここにフレーバーテキストのプレフィックスロジックを追加可能
                text += `${icon}${l}\n`;
            });
            text += `\n`;
        });

        // 結果に基づくイントロ/アウトロを追加
        // 成功なら... "彼らは無事に帰還した。"
        return text;
    }
}
