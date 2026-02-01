import { TRAITS, ADVENTURER_TYPES, ADVENTURER_JOB_NAMES, JOIN_TYPE_NAMES, LEAVE_TYPE_NAMES } from '../../data/constants.js';

export class ArchivesScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.currentTab = 'FINANCE'; // 財務 | 引退 | 市場 | 統計
        this.state = {
            selectedRetiredId: null,
            sortKey: 'ID',
            sortOrder: 'DESC',
            currentDetailTab: 'STATUS' // ステータス | 経歴 | 名鑑
        };
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

        // タブ設定
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

        // 詳細描画
        this._renderFinanceDetail(container.querySelector('#finance-detail-view'), history[this.selectedDayIndex]);

        // スクロール位置の復元
        const newListContainer = container.querySelector('#finance-table-container');
        if (newListContainer && typeof this.financeScrollTop !== 'undefined') {
            newListContainer.scrollTop = this.financeScrollTop;
        }

        // イベント設定
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

        container.innerHTML = '';
        container.classList.add('grid-2-col-fixed-right');

        // --- Left: List ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel flex-col';
        listPanel.innerHTML = `<div class="panel-header">過去帳 (${list.length}名)</div>`;

        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1 scroll-y';
        listPanel.appendChild(listContainer);
        container.appendChild(listPanel);

        // --- Right: Detail ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel flex-col';
        container.appendChild(detailPanel);

        // リスト描画
        this._renderRetiredList(listContainer, list, detailPanel);

        // 選択状態の復元
        if (this.state.selectedRetiredId) {
            const adv = list.find(a => a.id === this.state.selectedRetiredId);
            if (adv) {
                this._renderRetiredDetail(detailPanel, adv);
            } else {
                this.state.selectedRetiredId = null;
            }
        }
    }

    _renderRetiredList(container, list, detailPanel) {
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state">引退者はまだいません</div>';
            return;
        }

        // ソート: 最新順 (引退日またはID)
        const sorted = [...list].sort((a, b) => b.leftDay - a.leftDay);

        sorted.forEach(adv => {
            const el = this._createRetiredItem(adv);
            el.addEventListener('click', () => {
                this.state.selectedRetiredId = adv.id;
                container.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');
                this._renderRetiredDetail(detailPanel, adv);
            });
            if (this.state.selectedRetiredId === adv.id) {
                el.classList.add('selected');
            }
            container.appendChild(el);
        });
    }

    _createRetiredItem(adv) {
        const div = document.createElement('div');
        div.className = 'list-item list-item-history';

        // 引退理由テキスト
        const reasonStr = LEAVE_TYPE_NAMES[adv.reason] || adv.reason || '不明';

        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-title font-bold text-main">
                    ${adv.title ? `<span class="text-xs text-accent">《${adv.title}》</span> ` : ''}${adv.name}
                </span>
                <span class="status-badge bg-normal text-xs">${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</span>
            </div>
            <div class="list-item-meta">
                <span>Rank ${adv.rankLabel || '?'}</span>
                <span>出身: ${adv.origin ? adv.origin.name : '不明'}</span>
            </div>
            <div class="text-meta mt-xs pt-xs border-t-dashed text-right">
                Day ${adv.leftDay}: ${reasonStr}
            </div>
        `;
        return div;
    }

    _renderRetiredDetail(panel, adv) {
        const titlePart = adv.title ? `<span style="font-size:0.8em; color:#d84315;">《${adv.title}》</span>` : '';

        panel.innerHTML = `
            <div class="panel-header flex-no-shrink">
                ${titlePart}${adv.name} の記録
            </div>
        `;

        // タブ
        const tabs = document.createElement('div');
        tabs.className = 'tabs flex-no-shrink';
        tabs.innerHTML = `
            <button class="tab ${this.state.currentDetailTab === 'STATUS' ? 'active' : ''}" data-tab="STATUS">ステータス</button>
            <button class="tab ${this.state.currentDetailTab === 'HISTORY' ? 'active' : ''}" data-tab="HISTORY">経歴</button>
            <button class="tab ${this.state.currentDetailTab === 'MEIKAN' ? 'active' : ''}" data-tab="MEIKAN">名鑑</button>
        `;
        panel.appendChild(tabs);

        // コンテンツ
        const content = document.createElement('div');
        content.className = 'scroll-y flex-1 p-sm';
        panel.appendChild(content);

        this._renderRetiredTabContent(content, adv);

        tabs.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentDetailTab = btn.dataset.tab;
                tabs.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._renderRetiredTabContent(content, adv);
            });
        });
    }

    _renderRetiredTabContent(container, adv) {
        container.innerHTML = '';
        if (this.state.currentDetailTab === 'STATUS') {
            this._renderStatusTab(container, adv);
        } else if (this.state.currentDetailTab === 'HISTORY') {
            this._renderHistoryTab(container, adv);
        } else if (this.state.currentDetailTab === 'MEIKAN') {
            this._renderMeikanTab(container, adv);
        }
    }

    _renderStatusTab(container, adv) {
        const originName = adv.origin ? (adv.origin.name || adv.origin.id) : '不明';
        const reasonStr = LEAVE_TYPE_NAMES[adv.reason] || adv.reason || '-';

        // 基本情報
        const info = document.createElement('div');
        info.innerHTML = `
            <div class="sub-header">基本情報</div>
            <p>職業: ${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</p>
            <p>出身地: ${originName}</p>
            <p>雇用形態: ${JOIN_TYPE_NAMES[adv.joinType] || adv.joinType || '-'}</p>
            <p>在籍期間: ${adv.careerDays || 0}日</p>
            <p>引退日: Day ${adv.leftDay} (${reasonStr})</p>
            <hr>
            <div class="sub-header">最終評価</div>
            <p>ランク: <b>${adv.rankLabel}</b> (評価値 ${Math.floor(adv.rankValue)})</p>
            <p>信頼度: ${adv.trust}</p>
        `;
        container.appendChild(info);

        // ステータス
        if (adv.stats) {
            const statsDiv = document.createElement('div');
            statsDiv.innerHTML = `<div class="sub-header">能力値</div>`;
            for (const [key, val] of Object.entries(adv.stats)) {
                const barWidth = Math.min(100, (val / 120) * 100);
                statsDiv.innerHTML += `
                    <div class="stat-bar-container">
                        <div class="stat-bar-header">
                            <span>${key}</span>
                            <span>${val.toFixed(1)}</span>
                        </div>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-fill" style="width:${barWidth}%;"></div>
                        </div>
                    </div>
                `;
            }
            container.appendChild(statsDiv);
        }

        // 特性
        if (adv.temperament && adv.traits) {
            const t = adv.temperament;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = `
                <div class="sub-header">気質・特性</div>
                <div style="font-size:0.9em;">
                    危険志向:${t.risk} / 金銭欲:${t.greed} / 社交性:${t.social}
                </div>
                <div style="margin-top:0.5rem;">
                    ${adv.traits.map(tKey => {
                const tr = TRAITS[tKey];
                return tr ? `<span class="trait-tag" title="${tr.effects}">[${tr.name}]</span>` : '';
            }).join(' ')}
                </div>
            `;
            container.appendChild(tempDiv);
        }

        // 奥義
        if (adv.arts) {
            const artsDiv = document.createElement('div');
            artsDiv.innerHTML = `<div class="sub-header">習得奥義</div>`;
            if (adv.arts.length > 0) {
                artsDiv.innerHTML += `<div style="display:flex; flex-wrap:wrap; gap:0.3rem;">
                    ${adv.arts.map(art => `
                        <div style="background:#fff3e0; border:1px solid #ffcc80; color:#e65100; padding:2px 6px; border-radius:4px; font-size:0.9em; font-weight:bold;">
                            ⚡ ${art.name}
                        </div>
                    `).join('')}
                </div>`;
            } else {
                artsDiv.innerHTML += `<div class="text-sm text-muted">なし</div>`;
            }
            container.appendChild(artsDiv);
        }
    }

    _renderHistoryTab(container, adv) {
        const list = document.createElement('div');
        if (!adv.history || adv.history.length === 0) {
            list.innerHTML = '<div class="empty-state">記録なし</div>';
        } else {
            list.innerHTML = adv.history.map(h => `
                <div style="padding:0.5rem; border-left:2px solid #bdbdbd; margin-left:0.5rem; position:relative;">
                    <div style="position:absolute; left:-6px; top:0.8rem; width:10px; height:10px; background:#757575; border-radius:50%;"></div>
                    <div class="text-meta">Day ${h.day}</div>
                    <div style="color:#424242;">${h.text}</div>
                </div>
            `).join('');
        }
        container.appendChild(list);

        // サマリー
        if (adv.records) {
            const statsSummary = document.createElement('div');
            statsSummary.style.marginTop = '1rem';
            statsSummary.style.padding = '1rem';
            statsSummary.style.background = '#fafafa';
            statsSummary.style.border = '1px dashed #ccc';

            // 冒険者画面と同様のロジック (実績/討伐)
            let achievementHtml = "";
            if (adv.records.majorAchievements && adv.records.majorAchievements.length > 0) {
                achievementHtml = adv.records.majorAchievements.map(a =>
                    `<div><span style="color:#666; font-size:0.9em;">[Day${a.day}]</span> <span style="font-weight:bold;">${a.title}</span> <span style="font-size:0.8em; color:#e65100;">(Rank ${a.rank})</span></div>`
                ).join('');
            } else {
                achievementHtml = '<div style="color:#999; font-size:0.9em;">なし</div>';
            }

            statsSummary.innerHTML = `
                <div class="text-sm font-bold" style="margin-bottom:0.5rem; border-bottom:1px solid #ddd; padding-bottom:0.2rem;">主な功績</div>
                <div class="text-sm" style="margin-bottom:1rem;">${achievementHtml}</div>
            `;
            container.appendChild(statsSummary);
        }
    }

    _renderMeikanTab(container, adv) {
        // 冒険者画面のロジックを再利用 (簡易版)
        const bio = adv.bio || {};
        const createSection = (title, content) => {
            if (!content) return '';
            let htmlContent = Array.isArray(content) ? content.map(l => `<p>${l}</p>`).join('') : `<p>${content}</p>`;
            return `<div class="mb-md"><div class="sub-header">${title}</div><div class="serif">${htmlContent}</div></div>`;
        };

        let html = '<div class="p-sm">';
        html += createSection('人物', bio.intro);
        html += createSection('主な経歴', bio.career);
        if (bio.flavor) html += createSection('評価', bio.flavor);
        html += '</div>';

        if (html === '<div class="p-sm"></div>') {
            container.innerHTML = '<div class="empty-state">名鑑データなし</div>';
        } else {
            container.innerHTML = html;
        }
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
