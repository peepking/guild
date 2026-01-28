
export class ArchivesScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.currentTab = 'FINANCE'; // FINANCE | RETIRED | MARKET | STATS
    }

    render(container, guild, state, logs) {
        this.container = container;

        // Capture scroll position before wiping (Finance Tab)
        const financeList = container.querySelector('#finance-table-container');
        if (financeList) {
            this.financeScrollTop = financeList.scrollTop;
        }

        container.innerHTML = `
            <div class="panel" style="height:100%;">
                <div class="panel-header">ギルド資料室</div>
                
                <div class="tabs">
                    <button class="tab ${this.currentTab === 'FINANCE' ? 'active' : ''}" data-tab="FINANCE">収支記録</button>
                    <button class="tab ${this.currentTab === 'RETIRED' ? 'active' : ''}" data-tab="RETIRED">過去帳</button>
                    <button class="tab ${this.currentTab === 'MARKET' ? 'active' : ''}" data-tab="MARKET">市場相場</button>
                </div>
                
                <div id="archives-content" class="archives-content" style="flex:1; overflow-y:auto; padding:0 0.5rem;">
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

        // Capture scroll position logic moved to render() before wipe
        // Just verify here? No need, stored in this.financeScrollTop

        // Pagination State (stored in instance or just local render?)
        // Better to store in instance to persist across re-renders within tab
        if (typeof this.financePage === 'undefined') this.financePage = 0;
        if (typeof this.selectedDayIndex === 'undefined') this.selectedDayIndex = 0;

        const PAGE_SIZE = 100;
        const totalPages = Math.ceil(history.length / PAGE_SIZE);
        const start = this.financePage * PAGE_SIZE;
        const end = start + PAGE_SIZE;
        const pageItems = history.slice(start, end);

        // Layout: Left (Detail), Right (List)
        container.innerHTML = `
            <div style="display:flex; gap:1rem; height:100%;">
                
                <!-- LEFT: Details -->
                <div id="finance-detail-view" style="flex:1; border:1px solid #d7ccc8; border-radius:4px; padding:1rem; background:#fff; overflow-y:auto;">
                    <div style="text-align:center; color:#888; margin-top:2rem;">右側のリストから日付を選択してください</div>
                </div>

                <!-- RIGHT: List -->
                <div style="flex:1.2; display:flex; flex-direction:column;">
                    <!-- Controls -->
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; align-items:center;">
                        <button class="btn-secondary" style="padding:0.2rem 0.5rem; width:auto;" id="prev-page" ${this.financePage <= 0 ? 'disabled' : ''}>&lt;</button>
                        <span class="text-meta">Page ${this.financePage + 1} / ${totalPages}</span>
                        <button class="btn-secondary" style="padding:0.2rem 0.5rem; width:auto;" id="next-page" ${this.financePage >= totalPages - 1 ? 'disabled' : ''}>&gt;</button>
                    </div>

                    <!-- Table -->
                    <div id="finance-table-container" style="flex:1; overflow-y:auto; border:1px solid #d7ccc8; border-radius:4px;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                            <thead style="background:#d7ccc8; color:#3e2723; position:sticky; top:0;">
                                <tr>
                                    <th style="padding:0.4rem;">Day</th>
                                    <th style="padding:0.4rem; text-align:right;">収入</th>
                                    <th style="padding:0.4rem; text-align:right;">支出</th>
                                    <th style="padding:0.4rem; text-align:right;">残高</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageItems.map((item, idx) => {
            const realIdx = start + idx;
            const isSelected = this.selectedDayIndex === realIdx;
            const bg = isSelected ? '#ffe0b2' : ((idx % 2 === 0) ? '#fafafa' : '#fff');
            return `
                                        <tr class="finance-row" data-idx="${realIdx}" style="background:${bg}; cursor:pointer; border-bottom:1px solid #eee;">
                                            <td style="padding:0.4rem; text-align:center;">${item.day}</td>
                                            <td style="padding:0.4rem; text-align:right; color:#2e7d32;">${item.income > 0 ? '+' + item.income : '-'}</td>
                                            <td style="padding:0.4rem; text-align:right; color:#c62828;">${item.expense < 0 ? item.expense : (item.expense > 0 ? '-' + item.expense : '-')}</td>
                                            <td style="padding:0.4rem; text-align:right; font-weight:bold;">${item.balance}</td>
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
            <div style="display:flex; gap:1rem; margin-bottom:1rem; padding:0.5rem; background:#fff8e1; border-radius:4px;">
                <div style="flex:1; text-align:center;">
                    <div class="text-meta">収入</div>
                    <div style="color:#2e7d32; font-weight:bold;">+${dayData.income}</div>
                </div>
                <div style="flex:1; text-align:center;">
                    <div class="text-meta">支出</div>
                    <div style="color:#c62828; font-weight:bold;">${dayData.expense}</div>
                </div>
                <div style="flex:1; text-align:center;">
                    <div class="text-meta">日次収支</div>
                    <div style="font-weight:bold;">${(dayData.income + dayData.expense) >= 0 ? '+' : ''}${dayData.income + dayData.expense}</div>
                </div>
            </div>

            <div style="font-size:0.9rem;">
                ${dayData.details && dayData.details.length > 0 ?
                dayData.details.map(d => `
                        <div style="padding:0.4rem 0; border-bottom:1px dashed #efebe9; display:flex; justify-content:space-between;">
                            <span>${d.reason}</span>
                            <span style="font-weight:bold; color:${d.amount >= 0 ? '#2e7d32' : '#c62828'};">
                                ${d.amount >= 0 ? '+' : ''}${d.amount}
                            </span>
                        </div>
                    `).join('')
                : '<div class="text-sub" style="text-align:center;">詳細なし</div>'}
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
            <div class="list-item" style="background:#eceff1; border-color:#cfd8dc;">
                <div class="list-item-header">
                    <span class="list-item-title" style="color:#546e7a;">
                        ${adv.title ? `<span style="font-size:0.85em; color:#e64a19;">《${adv.title}》</span> ` : ''}${adv.name}
                    </span>
                    <span class="status-badge bg-normal">${adv.type}</span>
                </div>
                <div class="list-item-meta">
                    <span>Rank ${adv.rank}</span>
                    <span>出身: ${adv.origin.name}</span>
                </div>
                <div class="text-meta" style="margin-top:0.4rem; padding-top:0.4rem; border-top:1px dashed #cfd8dc;">
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
        // Access Items via GameLoop -> QuestService -> Simulator -> Items
        // This is a bit deep, maybe QuestService exposes getting methods?
        // Let's rely on basic logic for now.
        // Assuming we can access questService
        const qs = this.gameLoop.questService;
        if (!qs || !qs.simulator || !qs.simulator.items) {
            container.innerHTML = '<div class="empty-state">市場データ取得不可</div>';
            return;
        }

        // Aggregate all items
        const allItems = [];
        const regions = ['EAST', 'NORTH', 'SOUTH', 'WEST', 'CENTRAL'];
        regions.forEach(r => {
            const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
            ranks.forEach(rank => {
                const items = qs.simulator.items[r]?.[rank] || [];
                items.forEach(i => {
                    const price = this._estimatePrice(rank); // Temporary estimation
                    allItems.push({ ...i, region: r, rank, price });
                });
            });
        });

        // Unique by name
        const uniqueItems = Array.from(new Map(allItems.map(item => [item.name, item])).values());
        uniqueItems.sort((a, b) => a.price - b.price);

        let html = `
            <div style="margin-bottom:0.5rem; font-size:0.8rem; color:#888;">※ ギルド標準買取価格表</div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem;">
        `;

        uniqueItems.forEach(item => {
            html += `
                <div style="border:1px solid #d7ccc8; padding:0.5rem; background:#fff; border-radius:4px;">
                    <div style="font-weight:bold; color:#3e2723;">${item.name}</div>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#5d4037;">
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
        // Simple logic mirroring material value
        const rankValues = { 'E': 20, 'D': 50, 'C': 100, 'B': 200, 'A': 300, 'S': 500 };
        return rankValues[rank] || 20;
    }

    _getRegionLabel(code) {
        const map = { EAST: '東', NORTH: '北', SOUTH: '南', WEST: '西', CENTRAL: '中' };
        return map[code] || code;
    }
}
