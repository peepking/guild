import { UI_CONSTANTS } from '../../data/ui_constants.js';

/**
 * クエスト履歴画面クラス
 * 過去のクエスト結果や詳細ログを表示します。
 */
export class QuestHistoryScreen {
    /**
     * コンストラクタ
     * @param {object} gameLoop 
     */
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.state = {
            currentPage: 0,
            selectedHistoryId: null
        };
        this.ITEMS_PER_PAGE = 100;
    }

    /**
     * 画面を描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     * @param {object} globalState 
     */
    render(container, guild, globalState) {
        container.innerHTML = '';
        container.className = 'screen-container grid-history';

        // --- 左: 履歴リスト ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel flex-col p-sm';

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'list-header';
        header.textContent = '依頼履歴';
        listPanel.appendChild(header);

        // リストコンテナ
        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1';
        listContainer.id = 'history-list-container'; // 必要に応じてアクセスしやすくするID

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
            empty.className = 'empty-state';
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
        pagination.className = 'flex-between p-sm border-t-soft';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn-secondary py-xs w-auto'; // スタイル合わせ
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
        nextBtn.className = 'btn-secondary py-xs w-auto'; // スタイル合わせ
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
        detailPanel.className = 'panel detail-panel bg-parchment';

        const selectedItem = history.find(h => h.id === this.state.selectedHistoryId);

        if (selectedItem) {
            this._renderDetail(detailPanel, selectedItem);
        } else {
            detailPanel.innerHTML = `
                <div class="empty-state-centered">
                    <div class="empty-state-icon">📜</div>
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

    /**
     * 履歴リストアイテムのDOM要素を作成します。
     * @param {object} item - 履歴アイテムデータ
     * @returns {HTMLElement} 作成されたDOM要素
     */
    _createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'list-item';
        if (this.state.selectedHistoryId === item.id) {
            div.className += ' selected';
        }

        let statusColorClass = UI_CONSTANTS.CLASSES.SUB_TEXT; // 期限切れ/不明
        let statusText = '終了';
        if (item.result === 'SUCCESS') {
            statusColorClass = 'text-success'; // 緑
            statusText = '成功';
        } else if (item.result === 'FAILURE') {
            statusColorClass = 'text-reckless'; // 赤
            statusText = '失敗';
        } else if (item.result === 'EXPIRED') {
            statusColorClass = 'text-warning'; // オレンジ
            statusText = '期限切れ';
        }

        const specialBadge = item.isSpecial ? '<span class="status-badge bg-dark-grey text-parchment">特務</span> ' : '';

        div.innerHTML = `
            <div class="list-item-header">
                ${specialBadge}
                <span class="list-item-title">${item.title}</span>
            </div>
            <div class="list-item-meta">
                <span class="font-bold ${statusColorClass}">${statusText}</span>
                <span class="text-sub">Day ${item.date}</span>
                <span class="status-badge status-badge-rank">Rank ${item.rank}</span>
            </div>
        `;
        return div;
    }

    /**
     * 詳細パネルに履歴アイテムの詳細を描画します。
     * @param {HTMLElement} panel - 詳細パネル要素
     * @param {object} item - 履歴アイテムデータ
     * @returns {void}
     */
    _renderDetail(panel, item) {
        panel.innerHTML = `<div class="panel-header">${item.title}</div>`;

        let resultLabel = '';
        if (item.result === 'SUCCESS') resultLabel = '<span class="text-success font-bold">依頼達成</span>';
        else if (item.result === 'FAILURE') resultLabel = '<span class="text-reckless font-bold">依頼失敗</span>';
        else resultLabel = '<span class="text-warning font-bold">期限切れ</span>';

        panel.innerHTML += `
            <div class="flex-between">
                ${resultLabel}
                <span class="text-sub">完了日: Day ${item.date}</span>
            </div>
            <hr class="separator">
            <div class="text-desc">
                ${item.description || "詳細不明"}
            </div>
            <div class="quest-detail-grid">
                <div>ランク: <b>${item.rank}</b></div>
                <div>参加: ${item.members.length > 0 ? item.members.length + '人' : 'なし'}</div>
            </div>
            <br>
        `;

        if (item.result !== 'EXPIRED') {
            panel.innerHTML += `
                <div class="quest-reward-box">
                    <b>報酬:</b> ${item.reward.money}G / 評判 ${item.reward.reputation > 0 ? '+' : ''}${item.reward.reputation}
                </div>
                <div class="mt-sm">
                    <b>担当者:</b> ${item.members.join(', ')}
                </div>
            `;
        }

        // 冒険日誌エリア
        panel.innerHTML += `<div class="sub-header mt-lg">冒険日誌</div>`;
        const logArea = document.createElement('div');
        logArea.className = 'log-area';

        if (item.logs && item.logs.length > 0) {
            logArea.textContent = this._formatLogs(item.logs);
        } else {
            logArea.textContent = '記録なし';
        }

        panel.appendChild(logArea);
    }

    /**
     * 日次ログを整形して文字列として返します。
     * @param {Array<{day: number, logs: string[]}>} dailyLogs - 日次ログの配列
     * @returns {string} 整形されたログ文字列
     */
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
        return text;
    }
}
