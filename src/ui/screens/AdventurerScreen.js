import { TRAITS, ADVENTURER_TYPES, ADVENTURER_JOB_NAMES, JOIN_TYPE_NAMES } from '../../data/constants.js';

export class AdventurerScreen {
    constructor() {
        this.state = {
            selectedAdventurerId: null,
            currentTab: 'STATUS', // STATUS | HISTORY
            // ソート & フィルタ状態
            sortKey: 'RANK', // RANK, DAYS, TRUST, STATE, ID
            sortOrder: 'DESC', // ASC, DESC
            filterClass: 'ALL',
            filterRank: 'ALL',
            filterStatus: 'ALL' // ALL, AVAILABLE, QUESTING, RECOVERY
        };
    }

    render(container, guild, globalState) {
        // 重複防止のためコンテナをクリア
        container.innerHTML = '';

        // レイアウト: 当面は全幅リスト (詳細が必要なら分割)
        container.classList.add('grid-2-col-fixed-right');

        // --- 左: リスト ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel adventurer-list-panel flex-col';

        // ヘッダー & ツールバー
        const header = document.createElement('div');
        header.innerHTML = `<h2>冒険者一覧 (${guild.adventurers.length}名)</h2>`;
        listPanel.appendChild(header);

        this._renderToolbar(listPanel, guild);

        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1 scroll-y';
        listPanel.appendChild(listContainer);

        container.appendChild(listPanel);

        // --- 右: 詳細 ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel flex-col';

        // リスト描画ロジック (detailPanelが定義された後に実行)
        this._renderList(listContainer, guild, detailPanel);

        // 選択状態の復元 (バッファ修正)
        if (this.state.selectedAdventurerId) {
            const adv = guild.adventurers.find(a => a.id === this.state.selectedAdventurerId);
            if (adv) {
                this._renderDetail(detailPanel, adv);
            } else {
                this.state.selectedAdventurerId = null; // 存在しない場合はリセット
            }
        }

        container.appendChild(detailPanel);
    }

    _renderList(container, guild, detailPanel) {
        container.innerHTML = '';

        // 1. フィルタ
        let filtered = guild.adventurers.filter(adv => {
            // クラスフィルタ
            if (this.state.filterClass !== 'ALL' && adv.type !== this.state.filterClass) return false;

            // ランクフィルタ (ラベルを使用)
            if (this.state.filterRank !== 'ALL' && adv.rankLabel !== this.state.filterRank) return false;

            // 状態フィルタ
            if (this.state.filterStatus === 'AVAILABLE') {
                if (adv.state !== 'IDLE' || adv.recoveryDays > 0) return false;
            } else if (this.state.filterStatus === 'QUESTING') {
                if (adv.state !== 'QUESTING') return false;
            } else if (this.state.filterStatus === 'RECOVERY') {
                if (adv.recoveryDays <= 0) return false;
            }

            return true;
        });

        // 2. ソート
        filtered.sort((a, b) => {
            let valA, valB;

            switch (this.state.sortKey) {
                case 'RANK':
                    valA = a.rankValue; valB = b.rankValue;
                    break;
                case 'TRUST':
                    valA = a.trust; valB = b.trust;
                    break;
                case 'STATE':
                    // カスタム順序: IDLE > QUESTING > RECOVERY
                    const order = { 'IDLE': 3, 'QUESTING': 2, 'RECOVERY': 1 }; // 高 -> 低
                    // 数値比較用に調整
                    valA = order[a.state] || 0;
                    if (a.recoveryDays > 0) valA = 0; // RECOVERY
                    valB = order[b.state] || 0;
                    if (b.recoveryDays > 0) valB = 0;
                    break;
                case 'ID':
                default:
                    // ID文字列比較
                    if (a.id < b.id) return this.state.sortOrder === 'ASC' ? -1 : 1;
                    if (a.id > b.id) return this.state.sortOrder === 'ASC' ? 1 : -1;
                    return 0;
            }

            if (valA < valB) return this.state.sortOrder === 'ASC' ? -1 : 1;
            if (valA > valB) return this.state.sortOrder === 'ASC' ? 1 : -1;
            return 0;
        });

        // 3. 描画
        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding:1rem; color:#888; font-style:italic;">条件に合致する者はおりません。</div>';
            return;
        }

        filtered.forEach(adv => {
            const el = this._createAdventurerItem(adv);
            el.addEventListener('click', () => {
                this.state.selectedAdventurerId = adv.id;

                // 表示の更新
                container.querySelectorAll('.list-item').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');

                // 詳細描画
                this._renderDetail(detailPanel, adv);
            });
            container.appendChild(el);
        });
    }

    _renderToolbar(container, guild) {
        const toolbar = document.createElement('div');
        toolbar.className = 'panel-frame flex-between gap-sm font-header text-sm';

        // Helper for Selects
        const createSelect = (options, value, onChange, width = 'auto') => {
            const sel = document.createElement('select');
            sel.className = 'select-sm';
            if (width !== 'auto') sel.style.width = width;

            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.val;
                o.text = opt.label;
                if (opt.val === value) o.selected = true;
                sel.appendChild(o);
            });

            sel.addEventListener('change', (e) => onChange(e.target.value));
            return sel;
        };

        // --- Left Group: Filters ---
        const leftGroup = document.createElement('div');
        leftGroup.className = 'flex-wrap gap-xs';

        // Class Filter
        const classOpts = [{ val: 'ALL', label: '全部署' }];
        Object.values(ADVENTURER_TYPES).forEach(t => classOpts.push({ val: t, label: t }));
        leftGroup.appendChild(createSelect(classOpts, this.state.filterClass, (v) => {
            this.state.filterClass = v;
            this._refreshList(guild);
        }));

        // Rank Filter
        leftGroup.appendChild(createSelect([
            { val: 'ALL', label: '全等級' },
            { val: 'S', label: 'Rank S' },
            { val: 'A', label: 'Rank A' },
            { val: 'B', label: 'Rank B' },
            { val: 'C', label: 'Rank C' },
            { val: 'D', label: 'Rank D' },
            { val: 'E', label: 'Rank E' }
        ], this.state.filterRank, (v) => {
            this.state.filterRank = v;
            this._refreshList(guild);
        }));

        // Status Filter
        leftGroup.appendChild(createSelect([
            { val: 'ALL', label: '全状況' },
            { val: 'AVAILABLE', label: '待機中' },
            { val: 'QUESTING', label: '任務中' },
            { val: 'RECOVERY', label: '療養中' }
        ], this.state.filterStatus, (v) => {
            this.state.filterStatus = v;
            this._refreshList(guild);
        }));

        toolbar.appendChild(leftGroup);

        // --- Right Group: Sorting ---
        const rightGroup = document.createElement('div');
        rightGroup.className = 'flex-row gap-xs';

        // Sort Key
        rightGroup.appendChild(createSelect([
            { val: 'RANK', label: '評価順' },
            { val: 'TRUST', label: '信頼順' },
            { val: 'STATE', label: '状況順' },
            { val: 'ID', label: '登録順' }
        ], this.state.sortKey, (v) => {
            this.state.sortKey = v;
            this._refreshList(guild);
        }));

        // Sort Order Button
        const orderBtn = document.createElement('button');
        orderBtn.className = 'btn-icon-sm';

        const updateBtnText = () => {
            orderBtn.innerText = this.state.sortOrder === 'ASC' ? '▲' : '▼';
        };
        updateBtnText();

        orderBtn.addEventListener('click', () => {
            this.state.sortOrder = (this.state.sortOrder === 'ASC' ? 'DESC' : 'ASC');
            updateBtnText();
            this._refreshList(guild);
        });

        rightGroup.appendChild(orderBtn);
        toolbar.appendChild(rightGroup);

        container.appendChild(toolbar);
    }

    _refreshList(guild) {
        const listDiv = document.querySelector('.adventurer-list-panel .scroll-list');
        const detailPanel = document.querySelector('.detail-panel');
        if (listDiv && detailPanel) {
            this._renderList(listDiv, guild, detailPanel);
        }
    }

    // deleted duplicate or misplaced code

    _createAdventurerItem(adv) {
        const div = document.createElement('div');
        div.className = 'list-item list-item-adventure';

        // Highlight if selected
        if (this.state.selectedAdventurerId === adv.id) {
            div.classList.add('selected');
        }

        // Ranks
        const getRank = (val) => {
            if (val >= 100) return 'S';
            if (val >= 80) return 'A';
            if (val >= 60) return 'B';
            if (val >= 40) return 'C';
            if (val >= 20) return 'D';
            return 'E';
        };
        const ranks = Object.entries(adv.stats).map(([k, v]) => `${k}:${getRank(v)}`).join(' ');

        // Status text
        let statusText = `状態: ${adv.state}`;
        if (adv.recoveryDays > 0) {
            statusText = `療養中 (あと${adv.recoveryDays}日)`;
            div.classList.add('bg-reckless');
        } else if (adv.state === 'QUESTING') {
            statusText = `遠征中`;
            div.classList.add('bg-safe');
        } else {
            // Idle state
            div.classList.add('bg-parchment');
        }

        const traitsHtml = adv.traits.map(tKey => {
            const t = TRAITS[tKey];
            return t ? `<span class="trait-tag" title="${t.effects}">${t.name}</span>` : '';
        }).join('');

        // Title formatting
        const titleStr = adv.title ? ` <span class="text-accent-orange text-sm">《${adv.title}》</span>` : '';

        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-title">[${adv.rankLabel}] ${adv.name}${titleStr}</span>
                <span class="text-sm">(${ADVENTURER_JOB_NAMES[adv.type] || adv.type})</span>
            </div>
            <div class="text-meta">
               <div>評価値: ${Math.floor(adv.rankValue)} <span class="text-sub">(直近:${adv.perfEMA.toFixed(2)})</span></div>
               <div>${ranks}</div>
               <div>${traitsHtml}</div>
               <div class="font-bold">${statusText}</div>
            </div>
        `;
        return div;
    }

    _renderDetail(panel, adv) {
        // Header with Title
        const titlePart = adv.title ? `<span style="font-size:0.8em; color:#d84315;">《${adv.title}》</span>` : '';

        panel.innerHTML = `
            <div class="panel-header flex-no-shrink">
                ${titlePart}${adv.name} の詳細
            </div>
        `;

        // Tabs
        const tabs = document.createElement('div');
        tabs.className = 'tabs flex-no-shrink';
        tabs.innerHTML = `
            <button class="tab ${this.state.currentTab === 'STATUS' ? 'active' : ''}" data-tab="STATUS">ステータス</button>
            <button class="tab ${this.state.currentTab === 'HISTORY' ? 'active' : ''}" data-tab="HISTORY">経歴</button>
            <button class="tab ${this.state.currentTab === 'MEIKAN' ? 'active' : ''}" data-tab="MEIKAN">名鑑</button>
        `;
        panel.appendChild(tabs);

        // Content Area
        const content = document.createElement('div');
        content.id = 'detail-content';
        content.className = 'scroll-y flex-1 p-sm';
        panel.appendChild(content);

        // Render Initial Tab
        this._renderTabContent(content, adv);

        // Bind Tab Events
        tabs.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentTab = btn.dataset.tab;
                // Update specific styles
                tabs.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                this._renderTabContent(content, adv);
            });
        });
    }

    _renderTabContent(container, adv) {
        container.innerHTML = '';
        if (this.state.currentTab === 'STATUS') {
            this._renderStatusTab(container, adv);
        } else if (this.state.currentTab === 'HISTORY') {
            this._renderHistoryTab(container, adv);
        } else if (this.state.currentTab === 'MEIKAN') {
            this._renderMeikanTab(container, adv);
        }
    }

    _renderMeikanTab(container, adv) {
        const bio = adv.bio || {};

        const createSection = (title, content, isItalic = false) => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';

            let htmlContent = '';
            if (Array.isArray(content)) {
                htmlContent = content.map(line => `<p style="margin-bottom:0.4rem; line-height:1.6;">${line}</p>`).join('');
            } else {
                htmlContent = `<p style="line-height:1.6;">${content}</p>`;
            }

            if (isItalic) htmlContent = `<div style="font-style:italic; color:#555;">${htmlContent}</div>`;

            return `
                <div style="margin-bottom:1.5rem;">
                    <div class="sub-header" style="color:#5D4037; border-bottom:1px solid #d7ccc8; margin-bottom:0.5rem;">${title}</div>
                    <div style="padding:0 0.5rem; font-family:'Yu Mincho', serif;">
                        ${htmlContent}
                    </div>
                </div>
             `;
        };

        let html = '<div style="padding:0.5rem;">';

        // 1. Intro
        html += createSection('人物', bio.intro);

        // 2. Arts
        if (bio.arts && bio.arts.length > 0) {
            html += createSection('奥義・魔法', bio.arts);
        }

        // 3. Traits
        if (bio.traits && bio.traits.length > 0) {
            html += createSection('特性・人柄', bio.traits);
        }

        // 4. Career
        if (bio.career && bio.career.length > 0) {
            html += createSection('主な経歴', bio.career);
        }

        // 5. Nickname
        if (bio.nickname) {
            html += createSection('二つ名', bio.nickname);
        }

        // 6. Flavor (B Rank+)
        if (bio.flavor) {
            html += createSection('評価', bio.flavor, true);
        }

        if (html === '<div style="padding:0.5rem;">') {
            html += '<div class="text-muted" style="padding:1rem;">まだ記録された情報はありません。</div>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    _renderStatusTab(container, adv) {
        // 8.2 Basic Info
        const originName = adv.origin.name || adv.origin.id;
        const info = document.createElement('div');
        info.innerHTML = `
            <div class="sub-header">基本情報</div>
            <p>職業: ${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</p>
            <p>出身地: ${originName}</p>
            <p>雇用形態: ${JOIN_TYPE_NAMES[adv.joinType] || adv.joinType}</p>
            <p>在籍: ${adv.careerDays}日</p>
            <hr>
            <div class="sub-header">評価</div>
            <p>ランク: <b>${adv.rankLabel}</b> (評価値 ${Math.floor(adv.rankValue)})</p>
            <p>信頼度: ${adv.trust}</p>
            <p>調子(EMA): ${adv.perfEMA.toFixed(2)}</p>
        `;
        container.appendChild(info);

        // 8.4 Stats (Bars)
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

        // 8.5 Temperament & Traits
        const t = adv.temperament;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `
            <div class="sub-header">気質・特性</div>
            <div style="font-size:0.9em;">
                危険志向: ${t.risk > 0 ? '+' + t.risk : t.risk}<br>
                金銭欲: ${t.greed > 0 ? '+' + t.greed : t.greed}<br>
                社交性: ${t.social > 0 ? '+' + t.social : t.social}
            </div>
            <div style="margin-top:0.5rem;">
                ${adv.traits.map(tKey => {
            const tr = TRAITS[tKey];
            return `<span class="trait-tag" title="${tr.effects}">[${tr.name}]</span>`;
        }).join(' ')}
            </div>
        `;
        container.appendChild(tempDiv);

        // 8.6 Equipment
        const equipDiv = document.createElement('div');
        equipDiv.innerHTML = `<div class="sub-header">装備品</div>`;
        if (adv.equipment && adv.equipment.length > 0) {
            const listHtml = adv.equipment.map(eq => {
                return `<div class="text-sm mb-xs">
                    <span class="text-sub-color">[${eq.rank}]</span> ${eq.name}
                </div>`;
            }).join('');
            equipDiv.innerHTML += `<div>${listHtml}</div>`;
        } else {
            equipDiv.innerHTML += `<div class="text-sm text-muted">なし</div>`;
        }
        container.appendChild(equipDiv);

        // 8.7 Ultimate Arts
        const artsDiv = document.createElement('div');
        artsDiv.innerHTML = `<div class="sub-header">習得奥義</div>`;
        if (adv.arts && adv.arts.length > 0) {
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

        const moneyDiv = document.createElement('div');
        moneyDiv.innerHTML = `
            <div class="sub-header">所持金 (Debug)</div>
            <div>${adv.personalMoney || 0} G</div>
        `;
        container.appendChild(moneyDiv);
    }

    _renderHistoryTab(container, adv) {
        const list = document.createElement('div');

        if (!adv.history || adv.history.length === 0) {
            list.innerHTML = '<div class="empty-state" style="padding:1rem; color:#999;">特筆すべき出来事はまだありません</div>';
        } else {
            // Simple timeline
            list.innerHTML = adv.history.map(h => `
                <div style="padding:0.5rem; border-left:2px solid #d7ccc8; margin-left:0.5rem; position:relative;">
                    <div style="position:absolute; left:-6px; top:0.8rem; width:10px; height:10px; background:#8d6e63; border-radius:50%;"></div>
                    <div class="text-meta">Day ${h.day}</div>
                    <div style="color:#3e2723;">${h.text}</div>
                </div>
            `).join('');
        }

        container.appendChild(list);

        // Stats summary if needed
        const statsSummary = document.createElement('div');
        statsSummary.style.marginTop = '1rem';
        statsSummary.style.padding = '1rem';
        statsSummary.style.background = '#fafafa';
        statsSummary.style.border = '1px dashed #ccc';

        let achievementHtml = "";
        if (adv.records && adv.records.majorAchievements && adv.records.majorAchievements.length > 0) {
            achievementHtml = adv.records.majorAchievements.map(a =>
                `<div><span style="color:#666; font-size:0.9em;">[Day${a.day}]</span> <span style="font-weight:bold;">${a.title}</span> <span style="font-size:0.8em; color:#e65100;">(Rank ${a.rank})</span></div>`
            ).join('');
        } else {
            achievementHtml = '<div style="color:#999; font-size:0.9em;">なし</div>';
        }

        let battleHtml = "";
        if (adv.records && adv.records.majorKills && adv.records.majorKills.length > 0) {
            battleHtml = adv.records.majorKills.map(k =>
                `<div><span style="color:#666; font-size:0.9em;">[Day${k.day}]</span> <span style="font-weight:bold;">${k.name}</span> <span style="font-size:0.8em; color:#d32f2f;">(Rank ${k.rank}${k.isBoss ? ' BOSS' : ''})</span></div>`
            ).join('');
        } else {
            battleHtml = '<div style="color:#999; font-size:0.9em;">なし</div>';
        }

        statsSummary.innerHTML = `
            <div class="text-sm font-bold" style="margin-bottom:0.5rem; border-bottom:1px solid #ddd; padding-bottom:0.2rem;">主な功績</div>
            <div class="text-sm" style="margin-bottom:1rem;">
                ${achievementHtml}
            </div>

            <div class="text-sm font-bold" style="margin-bottom:0.5rem; border-bottom:1px solid #ddd; padding-bottom:0.2rem;">主な戦績 (討伐ランク順)</div>
            <div class="text-sm">
                ${battleHtml}
            </div>
        `;
        container.appendChild(statsSummary);
    }
}
