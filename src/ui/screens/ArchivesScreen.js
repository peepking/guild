import { ADVENTURER_JOB_NAMES } from '../../data/constants.js';

export class ArchivesScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.currentTab = 'FINANCE'; // FINANCE | RETIRED | MARKET | STATS
    }

    render(container, guild, state, logs) {
        this.container = container;

        // スクロール位置の保持 (財務タブ)
        const financeList = container.querySelector('#finance-table-container');
        if (financeList) {
            this.financeScrollTop = financeList.scrollTop;
        }

        container.innerHTML = `
            <div class="panel h-full">
                <div class="panel-header">ギルド資料室</div>
                
                <div class="tabs">
                    <button class="tab ${this.currentTab === 'FINANCE' ? 'active' : ''}" data-tab="FINANCE">収支記録</button>
                    <button class="tab ${this.currentTab === 'RETIRED' ? 'active' : ''}" data-tab="RETIRED">過去帳</button>
                    <button class="tab ${this.currentTab === 'MARKET' ? 'active' : ''}" data-tab="MARKET">市場相場</button>
                </div>
                
                <div id="archives-content" class="flex-1 scroll-y p-sm">
                    <!-- Content Injected -->
                </div>
            </div>
        `;

        this._renderContent(guild);

        // Bind Tabs
        container.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.getAttribute('data-tab');
                this.render(container, guild, state, logs);
            });
        });
    }

    _renderContent(guild) {
        const content = document.getElementById('archives-content');
        if (!content) return;

        switch (this.currentTab) {
            case 'FINANCE': this._renderFinance(content, guild); break;
            case 'RETIRED': this._renderRetired(content, guild); break;
            case 'MARKET': this._renderMarket(content, guild); break;
            default: content.innerHTML = '<div class="empty-state">準備中</div>';
        }
    }

    _renderFinance(container, guild) {
        const history = guild.financeHistory || [];
        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">記録はありません</div>';
            return;
        }

        if (typeof this.financePage === 'undefined') this.financePage = 0;
        if (typeof this.selectedDayIndex === 'undefined') this.selectedDayIndex = 0;

        const PAGE_SIZE = 100;
        const totalPages = Math.ceil(history.length / PAGE_SIZE);
        const start = this.financePage * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = history.slice(start, end);

        // レイアウト: 左(詳細)、右(リスト)
        container.innerHTML = `
            <div class="archives-layout">
                
                <!-- LEFT: Details -->
                <div id="finance-detail-view" class="finance-detail">
                    <div class="text-center text-sub mt-lg">右側のリストから日付を選択してください</div>
                </div>

                <!-- RIGHT: List -->
                <div class="finance-list-wrapper">
                    <!-- Controls -->
                    <div class="finance-controls">
                        <button class="btn-secondary py-xs w-auto" id="prev-page" ${this.financePage <= 0 ? 'disabled' : ''}>&lt;</button>
                        <span class="text-meta">Page ${this.financePage + 1} / ${totalPages}</span>
                        <button class="btn-secondary py-xs w-auto" id="next-page" ${this.financePage >= totalPages - 1 ? 'disabled' : ''}>&gt;</button>
                    </div>

                    <!-- Table -->
                    <div id="finance-table-container" class="finance-table-container">
                        <table class="finance-table">
                            <thead>
                                <tr>
                                    <th>Day</th>
                                    <th>収入</th>
                                    <th>支出</th>
                                    <th>残高</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageItems.map((item, idx) => {
            const realIdx = start + idx;
            const isSelected = this.selectedDayIndex === realIdx;
            const bg = isSelected ? 'style="background:#ffe0b2;"' : ((idx % 2 === 0) ? 'style="background:#fafafa;"' : '');
            return `
                                        <tr class="finance-row" data-idx="${realIdx}" ${bg}>
                                            <td style="text-align:center;">${item.day}</td>
                                            <td class="finance-income">${item.income > 0 ? '+' + item.income : '-'}</td>
                                            <td class="finance-expense">${item.expense < 0 ? item.expense : (item.expense > 0 ? '-' + item.expense : '-')}</td>
                                            <td class="finance-balance">${item.balance}</td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Render Detail
        this._renderFinanceDetail(container.querySelector('#finance-detail-view'), history[this.selectedDayIndex]);

        // Restore scroll position
        const newListContainer = container.querySelector('#finance-table-container');
        if (newListContainer && typeof this.financeScrollTop !== 'undefined') {
            newListContainer.scrollTop = this.financeScrollTop;
        }

        // Events
        container.querySelector('#prev-page').addEventListener('click', () => {
            if (this.financePage > 0) {
                this.financePage--;
                this.render(this.container, guild);
            }
        });
        container.querySelector('#next-page').addEventListener('click', () => {
            if (this.financePage < totalPages - 1) {
                this.financePage++;
                this.render(this.container, guild);
            }
        });
        container.querySelectorAll('.finance-row').forEach(row => {
            row.addEventListener('click', () => {
                this.selectedDayIndex = parseInt(row.dataset.idx);
                this.render(this.container, guild);
            });
        });
    }

    _renderFinanceDetail(container, dayData) {
        if (!dayData) return;

        container.innerHTML = `
            <div class="sub-header">Day ${dayData.day} の詳細</div>
            <div class="finance-summary-box">
                <div class="finance-summary-item">
                    <div class="text-meta">収入</div>
                    <div style="color:#2e7d32; font-weight:bold;">+${dayData.income}</div>
                </div>
                <div class="finance-summary-item">
                    <div class="text-meta">支出</div>
                    <div style="color:#c62828; font-weight:bold;">${dayData.expense}</div>
                </div>
                <div class="finance-summary-item">
                    <div class="text-meta">日次収支</div>
                    <div style="font-weight:bold;">${(dayData.income + dayData.expense) >= 0 ? '+' : ''}${dayData.income + dayData.expense}</div>
                </div>
            </div>

            <div class="text-sm">
                ${dayData.details && dayData.details.length > 0 ?
                dayData.details.map(d => `
                        <div class="finance-detail-row">
                            <span>${d.reason}</span>
                            <span style="font-weight:bold; color:${d.amount >= 0 ? '#2e7d32' : '#c62828'};">
                                ${d.amount >= 0 ? '+' : ''}${d.amount}
                            </span>
                        </div>
                    `).join('')
                : '<div class="text-sub text-center">詳細なし</div>'}
            </div>
        `;
    }

    _renderRetired(container, guild) {
        const list = guild.retiredAdventurers || [];
        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">引退者はまだいません</div>';
            return;
        }

        container.innerHTML = list.map(adv => `
            <div class="list-item bg-light border-sub">
                <div class="flex justify-between items-center mb-xs">
                    <span class="list-item-title font-bold text-main">
                        ${adv.title ? `<span class="text-sm text-accent">《${adv.title}》</span> ` : ''}${adv.name}
                    </span>
                    <span class="status-badge bg-normal">${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</span>
                </div>
                <div class="list-item-meta">
                    <span>Rank ${adv.rank}</span>
                    <span>出身: ${adv.origin.name}</span>
                </div>
                <div class="text-meta mt-sm pt-sm border-t-dashed">
                    ${adv.leftDay}日目に記録: ${this._getReasonText(adv.reason)}
                </div>
            </div>
        `).join('');
    }

    _getReasonText(reason) {
        const map = {
            'LEAVE': '一身上の都合により脱退',
            'RETIRE': '円満な引退',
            'DISAPPEAR': '行方不明',
            'DEATH': '殉職'
        };
        return map[reason] || reason;
    }

    _renderMarket(container, guild) {
        const qs = this.gameLoop.questService;
        if (!qs || !qs.simulator || !qs.simulator.items) {
            container.innerHTML = '<div class="empty-state">市場データ取得不可</div>';
            return;
        }

        // アイテム集計
        const allItems = [];
        const regions = ['EAST', 'NORTH', 'SOUTH', 'WEST', 'CENTRAL'];
        regions.forEach(r => {
            const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
            ranks.forEach(rank => {
                const items = qs.simulator.items[r]?.[rank] || [];
                items.forEach(i => {
                    const price = this._estimatePrice(rank);
                    allItems.push({ ...i, region: r, rank, price });
                });
            });
        });

        const uniqueItems = Array.from(new Map(allItems.map(item => [item.name, item])).values());
        uniqueItems.sort((a, b) => a.price - b.price);

        let html = `
            <div class="mb-sm text-sm text-sub">※ ギルド標準買取価格表</div>
            <div class="market-grid">
        `;

        uniqueItems.forEach(item => {
            html += `
                <div class="market-item">
                    <div class="market-item-header">${item.name}</div>
                    <div class="market-item-row">
                        <span>${this._getRegionLabel(item.region)} / ${item.rank}</span>
                        <span>${item.price} G</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    _estimatePrice(rank) {
        const rankValues = { 'E': 20, 'D': 50, 'C': 100, 'B': 200, 'A': 300, 'S': 500 };
        return rankValues[rank] || 20;
    }

    _getRegionLabel(code) {
        const map = { EAST: '東', NORTH: '北', SOUTH: '南', WEST: '西', CENTRAL: '中' };
        return map[code] || code;
    }
}
