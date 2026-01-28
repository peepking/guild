import { POLICIES, FACILITIES } from '../../data/ManagementData.js';

export class OperationScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.currentTab = 'FACILITY'; // FACILITY | POLICY | PERSONNEL | PR
        this.scrollPositions = {}; // Persist scroll per tab
    }

    render(container, guild, state, logs) {
        this.container = container;
        this.guild = guild; // Cache guild

        container.innerHTML = `
            <div class="panel h-full">
                <div class="panel-header">運営メニュー</div>
                
                <div class="tabs">
                    <button class="tab ${this.currentTab === 'FACILITY' ? 'active' : ''}" data-tab="FACILITY">施設管理</button>
                    <button class="tab ${this.currentTab === 'POLICY' ? 'active' : ''}" data-tab="POLICY">運営方針</button>
                    <button class="tab ${this.currentTab === 'PERSONNEL' ? 'active' : ''}" data-tab="PERSONNEL">顧問人事</button>
                    <button class="tab ${this.currentTab === 'PR' ? 'active' : ''}" data-tab="PR">広報活動</button>
                </div>
                
                <div id="operation-content" class="operation-layout flex-1 scroll-y p-md">
                    <!-- Content Injected -->
                </div>
            </div>
        `;

        this._renderContent(guild);

        // Restore & Track Scroll Logic
        const newContentEl = container.querySelector('#operation-content');
        if (newContentEl) {
            // Restore
            if (this.scrollPositions[this.currentTab]) {
                newContentEl.scrollTop = this.scrollPositions[this.currentTab];
            }

            // Track
            newContentEl.addEventListener('scroll', () => {
                this.scrollPositions[this.currentTab] = newContentEl.scrollTop;
            });
        }

        // Bind Tabs
        container.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentTab = btn.getAttribute('data-tab');
                this.render(container, guild, state, logs);
            });
        });
    }

    _renderContent(guild) {
        const content = document.getElementById('operation-content');
        if (!content) return;

        if (this.currentTab === 'FACILITY') {
            this._renderFacilities(content, guild);
        } else if (this.currentTab === 'POLICY') {
            this._renderPolicy(content, guild);
        } else if (this.currentTab === 'PERSONNEL') {
            this._renderPersonnel(content, guild);
        } else {
            this._renderPR(content, guild);
        }
    }

    _renderFacilities(container, guild) {
        // 1. Guild HQ (Special Handling)
        const softCap = guild.softCap || 10;
        const hqCost = softCap * 100;

        container.innerHTML = `
            <h3 class="section-header">ギルド本部</h3>
            <div class="operation-grid mb-lg">
                <div class="operation-card hero">
                    <h3>本部施設</h3>
                    <div class="operation-header-row">
                        <span>収容目安</span>
                        <span class="font-bold text-xl">${softCap}名</span>
                    </div>
                    <div class="policy-desc">
                        冒険者の拠点。規模を大きくすることで、より多くの冒険者を受け入れ可能。
                    </div>
                     <div class="flex-col-end gap-sm mt-auto">
                        <span class="font-bold text-status-${guild.money >= hqCost ? 'safe' : 'danger'}">増築: ${hqCost} G</span>
                        <button id="btn-expand" class="btn btn-primary w-full" ${guild.money < hqCost ? 'disabled' : ''}>実行</button>
                    </div>
                </div>
            </div>
            
            <h3 class="section-header">拡張施設</h3>
            <div id="facility-list" class="operation-grid">
                <!-- Facilities Injected Here -->
            </div>
        `;

        // Bind HQ Button
        container.querySelector('#btn-expand')?.addEventListener('click', () => {
            if (guild.money >= hqCost) {
                guild.money -= hqCost;

                // Log
                if (guild.todayFinance) {
                    guild.todayFinance.expense += hqCost;
                    guild.todayFinance.balance = guild.money;
                    guild.todayFinance.details.push({
                        reason: `施設増築 (Lv.${(guild.facilities?.extensionLevel || 0) + 1})`,
                        amount: -hqCost
                    });
                }

                guild.softCap += 5;
                if (!guild.facilities) guild.facilities = {};
                if (!guild.facilities.extensionLevel) guild.facilities.extensionLevel = 0;
                guild.facilities.extensionLevel++;

                this.gameLoop.uiManager.log(`ギルド本部を増築しました。(収容目安: ${guild.softCap}名)`, 'success');
                this.gameLoop.uiManager.render();
            }
        });

        // 2. Other Facilities
        const list = container.querySelector('#facility-list');
        Object.values(FACILITIES).forEach(def => {
            const currentLv = (guild.facilities && guild.facilities[def.id.toLowerCase()]) || 0;
            const nextLv = currentLv + 1;
            const isMax = currentLv >= def.maxLevel;

            let cost = 0;
            if (!isMax) {
                cost = (def.costMult === 0) ? def.baseCost : def.baseCost * nextLv;
            }

            const el = document.createElement('div');
            el.className = `operation-card ${currentLv > 0 ? '' : 'inactive'}`;

            el.innerHTML = `
                <div class="operation-header-row">
                    <div class="font-bold">${def.name}</div>
                    <span class="text-sm">Lv.${currentLv} / ${def.maxLevel}</span>
                </div>
                <div class="policy-desc" style="min-height:3em;">${def.description}</div>
                <div class="policy-effects">${def.effectDesc}</div>
                
                <div class="flex-col-end gap-sm mt-auto">
                    ${isMax
                    ? '<span style="color:var(--text-main);">最大レベル</span>'
                    : `<span class="font-bold text-status-${guild.money >= cost ? 'safe' : 'danger'}">改良: ${cost} G</span>`
                }
                    ${!isMax ? `<button class="btn-build btn btn-primary w-full" data-id="${def.id}" ${guild.money < cost ? 'disabled' : ''}>${currentLv === 0 ? '建設' : '強化'}</button>` : ''}
                </div>
            `;

            // Bind Build Button
            el.querySelector('.btn-build')?.addEventListener('click', () => {
                if (guild.money >= cost) {
                    guild.money -= cost;

                    // Log
                    if (guild.todayFinance) {
                        guild.todayFinance.expense += cost;
                        guild.todayFinance.balance = guild.money;
                        guild.todayFinance.details.push({
                            reason: `${def.name} ${currentLv === 0 ? '建設' : '強化'} (Lv.${nextLv})`,
                            amount: -cost
                        });
                    }

                    // Update Level
                    const key = def.id.toLowerCase();
                    if (!guild.facilities[key]) guild.facilities[key] = 0;
                    guild.facilities[key]++;

                    this.gameLoop.uiManager.log(`${def.name}を Lv.${guild.facilities[key]} に強化しました。`, 'success');
                    this.gameLoop.uiManager.render();
                }
            });

            list.appendChild(el);
        });
    }

    _renderPolicy(container, guild) {
        const activePolicyId = guild.activePolicy || 'BALANCED';

        container.innerHTML = `
            <div class="mb-md">
                <div class="policy-desc">
                    週に一度（7の倍数日）、ギルド全体の方針を変更できます。<br>
                    方針は依頼の危険度、報酬計算、冒険者の成長率に影響します。
                </div>
                <div id="policy-list" class="operation-grid"></div>
            </div>
        `;

        const list = container.querySelector('#policy-list');
        const canChange = this.gameLoop.managementService ? this.gameLoop.managementService.canChangePolicy(guild) : true;

        Object.values(POLICIES).forEach(p => {
            const isActive = p.id === activePolicyId;
            const item = document.createElement('div');
            item.className = `operation-card ${isActive ? 'hero' : ''}`;

            // Mod String
            let modStr = [];
            for (const [k, v] of Object.entries(p.mod)) {
                let val = Math.round((v - 1.0) * 100);
                let sign = val > 0 ? '+' : '';
                modStr.push(`${k} ${sign}${val}%`);
            }

            item.innerHTML = `
                <div class="operation-header-row">
                    <div class="font-bold text-lg">${p.name}</div>
                    ${isActive ? '<span class="status-badge bg-accent text-wood">適用中</span>' : ''}
                </div>
                <div class="policy-desc">${p.description}</div>
                <div class="policy-effects">効果: ${modStr.join(', ') || 'なし'}</div>
                
                ${!isActive ? `
                    <div class="text-right mt-auto">
                         <button class="btn-change-policy btn btn-primary" data-id="${p.id}" ${canChange ? '' : 'disabled'}>変更</button>
                    </div>
                ` : ''}
            `;
            list.appendChild(item);
        });

        // Bind Change Buttons
        list.querySelectorAll('.btn-change-policy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pid = e.target.dataset.id;
                if (this.gameLoop.managementService) {
                    if (this.gameLoop.managementService.setPolicy(guild, pid)) {
                        this.gameLoop.uiManager.render();
                    }
                }
            });
        });

        if (!canChange) {
            container.innerHTML += `<div class="text-center text-danger mt-md text-sm">方針変更は週の初め(7の倍数日)にのみ可能です。</div>`;
        }
    }

    _renderPersonnel(container, guild) {
        const ms = this.gameLoop.managementService;

        // Header
        const header = document.createElement('div');
        header.innerHTML = `
            <div class="policy-desc mb-md">
                上位ランクで引退した冒険者を「顧問」として雇用できます。<br>
                顧問は名声や育成などにボーナスを与えますが、日給が必要です。
            </div>
        `;
        container.appendChild(header);

        // Active Advisors
        const advisorSection = document.createElement('div');
        advisorSection.style.marginBottom = '2rem';

        let advisorListHtml = '';
        if (guild.advisors.length === 0) {
            advisorListHtml = `<div class="empty-state">契約中の顧問はいません</div>`;
        } else {
            advisorListHtml = `<div class="operation-grid"></div>`;
        }

        advisorSection.innerHTML = `
            <h3 class="section-header inline-block">契約中の顧問</h3>
            ${advisorListHtml}
        `;
        container.appendChild(advisorSection);

        if (guild.advisors.length > 0) {
            const grid = advisorSection.querySelector('.operation-grid');
            guild.advisors.forEach(adv => {
                const el = document.createElement('div');
                el.className = 'operation-card hero';

                let effStr = [];
                for (const [k, v] of Object.entries(adv.effect)) {
                    effStr.push(`${k} x${v}`);
                }

                el.innerHTML = `
                    <div class="operation-header-row">
                        <b>${adv.name}</b>
                        <span>${adv.roleName}</span>
                    </div>
                    <div class="policy-effects">効果: ${effStr.join(', ')}</div>
                    <div class="operation-header-row mt-auto">
                        <span class="text-sm">日給: ${adv.salary} G</span>
                        <button class="btn-fire btn-danger py-xs text-sm">解任</button>
                    </div>
                `;
                el.querySelector('.btn-fire').addEventListener('click', () => {
                    if (confirm(`${adv.name} を解任しますか？`)) {
                        ms.fireAdvisor(guild, adv.id);
                        this.gameLoop.uiManager.render();
                    }
                });
                grid.appendChild(el);
            });
        }

        // Candidates
        const candidateSection = document.createElement('div');
        candidateSection.innerHTML = `
            <h3 class="section-header inline-block">顧問候補 (引退者)</h3>
        `;

        if (!guild.advisorCandidates || guild.advisorCandidates.length === 0) {
            candidateSection.innerHTML += `<div class="empty-state">候補者はいません (ランクB以上で引退した冒険者が候補になります)</div>`;
        } else {
            const grid = document.createElement('div');
            grid.className = 'operation-grid';

            guild.advisorCandidates.forEach(cand => {
                const el = document.createElement('div');
                el.className = 'operation-card';

                let effStr = [];
                for (const [k, v] of Object.entries(cand.effect)) {
                    effStr.push(`${k} x${v}`);
                }

                el.innerHTML = `
                    <div class="operation-header-row">
                        <span>${cand.name}</span>
                        <span class="text-sm">Rank ${cand.rankLabel} / ${cand.roleName}</span>
                    </div>
                    <div class="policy-effects">効果: ${effStr.join(', ')}</div>
                    <div class="operation-header-row mt-auto">
                        <span class="text-sm">日給: ${cand.salary}G</span>
                        <button class="btn-hire btn btn-primary py-xs">雇用</button>
                    </div>
                `;

                el.querySelector('.btn-hire').addEventListener('click', () => {
                    if (ms.hireAdvisor(guild, cand.id)) {
                        this.gameLoop.uiManager.render();
                    }
                });
                grid.appendChild(el);
            });
            candidateSection.appendChild(grid);
        }
        container.appendChild(candidateSection);
    }

    _renderPR(container, guild) {
        const activePR = guild.activeBuffs.find(b => b.type === 'PR_CAMPAIGN');
        const cost = 200;
        const duration = 7;

        container.innerHTML = `
            <div class="operation-grid">
                ${activePR ? `
                    <div class="operation-card hero">
                        <h3>現在実施中のキャンペーン</h3>
                        <div class="operation-header-row">
                            <span>新規加入率アップ (効果1.5倍)</span>
                            <span class="status-badge bg-accent text-wood">実施中</span>
                        </div>
                        <div class="text-right mt-md">残り ${activePR.expiresDay - guild.day} 日</div>
                    </div>
                ` : `
                     <div class="operation-card" style="background:var(--bg-light); border-style:dashed;">
                        <h3 class="text-sub">キャンペーン未実施</h3>
                        <div class="policy-desc">現在実施中の広報キャンペーンはありません。</div>
                    </div>
                `}

                <div class="operation-card">
                    <h3>新規冒険者募集キャンペーン</h3>
                    <div class="policy-desc">
                        街中にポスターを掲示し、呼び込みを行います。<br>
                        7日間、冒険者の加入希望率が大幅に上昇します。
                    </div>
                    
                    <div class="flex-col-end gap-sm mt-auto">
                        <span class="font-bold text-status-${guild.money >= cost ? 'safe' : 'danger'}">${cost} G</span>
                        <button id="btn-pr" class="btn btn-primary w-full"
                        ${guild.money < cost || activePR ? 'disabled' : ''}>
                        ${activePR ? '実施中' : '実施'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.querySelector('#btn-pr')?.addEventListener('click', () => {
            if (guild.money >= cost && !activePR) {
                guild.money -= cost;

                // Log Finance
                if (guild.todayFinance) {
                    guild.todayFinance.expense += cost;
                    guild.todayFinance.balance = guild.money;
                    guild.todayFinance.details.push({
                        reason: `広報活動: 新規募集CP`,
                        amount: -cost
                    });
                }

                guild.activeBuffs.push({
                    type: 'PR_CAMPAIGN',
                    expiresDay: guild.day + duration,
                    effect: 1.5
                });
                this.gameLoop.uiManager.log(`新規募集キャンペーンを開始しました。(7日間)`, 'success');
                this.gameLoop.mailService.send("キャンペーン開始", `広報活動を開始しました。\n今後7日間、冒険者の加入率が上昇します。`, 'EVENT');

                // Full Render to update Top Bar
                this.gameLoop.uiManager.render();
            }
        });
    }
}
