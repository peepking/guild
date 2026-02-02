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
        container.classList.add('screen-content');

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'screen-header flex-row flex-between flex-center';
        header.innerHTML = `
            <h2>依頼履歴</h2>
            <button class="btn close-btn">閉じる</button>
        `;
        header.querySelector('.close-btn').addEventListener('click', () => {
            if (this.gameLoop.uiManager.currentScreen === this) {
                this.gameLoop.uiManager.popScreen();
            }
        });
        container.appendChild(header);

        // コンテンツレイアウト
        const content = document.createElement('div');
        content.className = 'screen-content-wrapper grid-2-col-fixed-right p-md panel-reset';

        // --- 左: 履歴リスト ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel flex-col';
        listPanel.innerHTML = `<div class="panel-header">履歴一覧</div>`;

        // リストコンテナ
        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1 scroll-y';
        listContainer.id = 'history-list-container';

        const history = this.gameLoop.questHistory || [];
        const totalPages = Math.ceil(history.length / this.ITEMS_PER_PAGE) || 1;

        // ページ修正
        if (this.state.currentPage >= totalPages) this.state.currentPage = totalPages - 1;
        if (this.state.currentPage < 0) this.state.currentPage = 0;

        const startIdx = this.state.currentPage * this.ITEMS_PER_PAGE;
        const endIdx = startIdx + this.ITEMS_PER_PAGE;
        const displayItems = history.slice(startIdx, endIdx);

        if (displayItems.length === 0) {
            listContainer.innerHTML = `<div class="empty-state ${UI_CONSTANTS.CLASSES.SUB_TEXT}">履歴はありません</div>`;
        } else {
            // DocumentFragmentを使用してパフォーマンス改善
            const fragment = document.createDocumentFragment();
            displayItems.forEach(item => {
                const el = this._createHistoryItem(item);
                el.onclick = () => {
                    // スクロール位置の保持
                    this.state.lastScrollTop = listContainer.scrollTop;
                    this.state.selectedHistoryId = item.id;
                    this.render(container, guild, globalState);
                };
                fragment.appendChild(el);
            });
            listContainer.appendChild(fragment);
        }

        listPanel.appendChild(listContainer);

        // ページネーション制御
        const pagination = document.createElement('div');
        pagination.className = 'flex-between p-sm border-t-soft';
        pagination.innerHTML = `
            <button class="btn-secondary py-xs w-auto" id="prev-page" ${this.state.currentPage === 0 ? 'disabled' : ''}>&lt;&lt; 前へ</button>
            <span class="text-meta">Page ${this.state.currentPage + 1} / ${totalPages}</span>
            <button class="btn-secondary py-xs w-auto" id="next-page" ${this.state.currentPage >= totalPages - 1 ? 'disabled' : ''}>次へ &gt;&gt;</button>
        `;
        listPanel.appendChild(pagination);

        // イベントリスナー
        pagination.querySelector('#prev-page').onclick = () => {
            this.state.currentPage--;
            this.render(container, guild, globalState);
        };
        pagination.querySelector('#next-page').onclick = () => {
            this.state.currentPage++;
            this.render(container, guild, globalState);
        };

        content.appendChild(listPanel);

        // --- 右: 詳細 ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel bg-parchment flex-col flex-1';

        const selectedItem = history.find(h => h.id === this.state.selectedHistoryId);

        if (selectedItem) {
            this._renderDetail(detailPanel, selectedItem);
        } else {
            detailPanel.innerHTML = `
                <div class="empty-state-centered ${UI_CONSTANTS.CLASSES.SUB_TEXT} h-full flex-center justify-center">
                    <div>
                        <div class="empty-state-icon text-3xl mb-sm">📜</div>
                        <p>履歴を選択してください</p>
                    </div>
                </div>
            `;
        }
        content.appendChild(detailPanel);
        container.appendChild(content);

        // スクロール復元
        if (typeof this.state.lastScrollTop !== 'undefined') {
            // DOM更新直後なのでsetTimeoutで確実に適用
            setTimeout(() => {
                const listEl = container.querySelector('#history-list-container');
                if (listEl) listEl.scrollTop = this.state.lastScrollTop;
            }, 0);
        }
    }

    _createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = `list-item list-item-history ${this.state.selectedHistoryId === item.id ? 'selected' : ''}`;

        let statusColorClass = UI_CONSTANTS.CLASSES.SUB_TEXT; // 期限切れ/不明
        let statusText = '終了';

        if (item.result === 'SUCCESS') {
            statusColorClass = UI_CONSTANTS.CLASSES.SAFE; // 緑
            statusText = '成功';
        } else if (item.result === 'FAILURE') {
            statusColorClass = UI_CONSTANTS.CLASSES.DANGER; // 赤
            statusText = '失敗';
        } else if (item.result === 'EXPIRED') {
            statusColorClass = UI_CONSTANTS.CLASSES.WARN; // オレンジ
            statusText = '期限切れ';
        }

        const specialBadge = item.isSpecial ? '<span class="status-badge bg-black text-white mr-xs">特務</span>' : '';

        div.innerHTML = `
            <div class="list-item-header flex-between">
                <div>
                   ${specialBadge}<span class="list-item-title font-bold">${item.title}</span>
                </div>
                <span class="text-sm font-bold ${statusColorClass}">${statusText}</span>
            </div>
            <div class="list-item-meta flex-between mt-xs">
                <span class="status-badge text-xs">Rank ${item.rank}</span>
                <span class="${UI_CONSTANTS.CLASSES.SUB_TEXT}">Day ${item.date}</span>
            </div>
        `;
        return div;
    }

    _renderDetail(panel, item) {
        panel.innerHTML = `<div class="panel-header flex-no-shrink">${item.title}</div>`;

        const content = document.createElement('div');
        content.className = 'scroll-y flex-1 p-md';

        let resultLabel = '';
        if (item.result === 'SUCCESS') resultLabel = `<span class="${UI_CONSTANTS.CLASSES.SAFE} font-bold">依頼達成</span>`;
        else if (item.result === 'FAILURE') resultLabel = `<span class="${UI_CONSTANTS.CLASSES.DANGER} font-bold">依頼失敗</span>`;
        else resultLabel = `<span class="${UI_CONSTANTS.CLASSES.WARN} font-bold">期限切れ</span>`;

        let html = `
            <div class="mb-md p-sm border-b-soft">
                <div class="flex-between mb-sm">
                    ${resultLabel}
                    <span class="text-sm">完了: Day ${item.date}</span>
                </div>
                <div class="${UI_CONSTANTS.CLASSES.SUB_TEXT} italic mb-sm">
                    ${item.description || "詳細不明"}
                </div>
                <div class="grid-2-col gap-sm text-sm">
                    <div>ランク: <b>${item.rank}</b></div>
                    <div>参加: ${item.members.length > 0 ? item.members.length + '人' : 'なし'}</div>
                </div>
            </div>
        `;

        if (item.result !== 'EXPIRED') {
            html += `
                <div class="card p-sm mb-md bg-white-smoke">
                    <div class="info-row">
                        <span class="label">報酬:</span>
                        <span>${item.reward.money} G / 評判 ${item.reward.reputation > 0 ? '+' : ''}${item.reward.reputation}</span>
                    </div>
                    <div class="info-row mt-xs">
                        <span class="label">担当者:</span>
                        <span class="text-sm">${item.members.join(', ')}</span>
                    </div>
                </div>
            `;
        }

        // 冒険日誌エリア
        html += `<div class="sub-header mt-lg">冒険日誌</div>
                 <div class="log-area font-serif-padded p-sm border-soft bg-white text-wood text-sm h-64 overflow-y-auto">`;

        if (item.logs && item.logs.length > 0) {
            html += this._formatLogs(item.logs).replace(/\n/g, '<br>');
        } else {
            html += '<div class="text-center text-muted mt-lg">記録なし</div>';
        }
        html += `</div>`;

        content.innerHTML = html;
        panel.appendChild(content);
    }

    _formatLogs(dailyLogs) {
        // ログの整形
        let text = "";
        dailyLogs.forEach(d => {
            text += `【Day ${d.day}】\n`;
            d.logs.forEach(l => {
                let icon = '';
                if (l.includes('戦闘')) icon = '⚔️ ';
                else if (l.includes('採取') || l.includes('発見')) icon = '🌿 ';
                else if (l.includes('休息') || l.includes('食事')) icon = '⛺ ';
                // その他アイコン

                text += `${icon}${l}\n`;
            });
            text += `\n`;
        });
        return text;
    }
}
