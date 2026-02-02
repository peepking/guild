import { POLICIES, FACILITIES, EFFECT_LABELS, CAMPAIGNS } from '../../data/ManagementData.js';
import { ADVISOR_CONFIG, ADVENTURER_JOB_NAMES, TRAITS, JOIN_TYPE_NAMES } from '../../data/constants.js';
import { UI_CONSTANTS } from '../../data/ui_constants.js';

export class OperationScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.currentTab = UI_CONSTANTS.OPERATION_TABS.FACILITY; // 施設 | 方針 | 人事 | 広報
        this.scrollPositions = {}; // タブごとのスクロール位置保持
        this.advisorState = {
            selectedId: null,
            detailTab: UI_CONSTANTS.ADVISOR_TABS.EFFECT // 効果, ステータス, 経歴, 名鑑
        };
    }

    render(container, guild, state, logs) {
        this.container = container;
        this.guild = guild; // ギルド情報をキャッシュ

        container.innerHTML = `
            <div class="panel h-full">
                <div class="panel-header">運営メニュー</div>
                
                <div class="tabs">
                    <button class="tab ${this.currentTab === UI_CONSTANTS.OPERATION_TABS.FACILITY ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.OPERATION_TABS.FACILITY}">施設管理</button>
                    <button class="tab ${this.currentTab === UI_CONSTANTS.OPERATION_TABS.POLICY ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.OPERATION_TABS.POLICY}">運営方針</button>
                    <button class="tab ${this.currentTab === UI_CONSTANTS.OPERATION_TABS.PERSONNEL ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.OPERATION_TABS.PERSONNEL}">顧問人事</button>
                    <button class="tab ${this.currentTab === UI_CONSTANTS.OPERATION_TABS.PR ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.OPERATION_TABS.PR}">広報活動</button>
                    <button class="tab ${this.currentTab === UI_CONSTANTS.OPERATION_TABS.SYSTEM ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.OPERATION_TABS.SYSTEM}">システム</button>
                </div>
                
                <div id="operation-content" class="operation-layout flex-1 scroll-y p-md">
                    <!-- Content Injected -->
                </div>
            </div>
        `;

        this._renderContent(guild);

        // スクロール位置の復元と追跡
        const newContentEl = container.querySelector('#operation-content');
        if (newContentEl) {
            // 復元
            if (this.scrollPositions[this.currentTab]) {
                newContentEl.scrollTop = this.scrollPositions[this.currentTab];
            }

            // 追跡
            newContentEl.addEventListener('scroll', () => {
                this.scrollPositions[this.currentTab] = newContentEl.scrollTop;
            });
        }

        // タブ設定
        // タブ設定 (メインタブのみを対象にする)
        const mainTabsCtx = container.querySelector('.tabs');
        if (mainTabsCtx) {
            mainTabsCtx.querySelectorAll('.tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.currentTab = btn.getAttribute('data-tab');
                    this.render(container, guild, state, logs);
                });
            });
        }
    }

    _renderContent(guild) {
        const content = document.getElementById('operation-content');
        if (!content) return;

        if (this.currentTab === UI_CONSTANTS.OPERATION_TABS.FACILITY) {
            this._renderFacilities(content, guild);
        } else if (this.currentTab === UI_CONSTANTS.OPERATION_TABS.POLICY) {
            this._renderPolicy(content, guild);
        } else if (this.currentTab === UI_CONSTANTS.OPERATION_TABS.PERSONNEL) {
            this._renderPersonnel(content, guild);
        } else if (this.currentTab === UI_CONSTANTS.OPERATION_TABS.SYSTEM) {
            this._renderSystem(content, guild);
        } else {
            this._renderPR(content, guild);
        }
    }

    /**
     * 施設管理タブを描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     */
    _renderFacilities(container, guild) {
        container.innerHTML = `
            <h3 class="section-header">ギルド本部</h3>
            <div id="hq-list" class="operation-grid mb-lg"></div>
            
            <h3 class="section-header">拡張施設</h3>
            <div id="facility-list" class="operation-grid"></div>
        `;

        const hqList = container.querySelector('#hq-list');
        const facilityList = container.querySelector('#facility-list');

        // 1. 収容人数 (本部)
        this._renderCapacityCard(hqList, guild);

        // 2. 本部施設 (広報 & 管理)
        const hqIds = ['PUBLIC_RELATIONS', 'ADMINISTRATION'];
        hqIds.forEach(id => {
            if (FACILITIES[id]) {
                this._renderSingleFacility(FACILITIES[id], hqList, guild);
            }
        });

        // 3. その他の施設
        Object.values(FACILITIES).forEach(def => {
            if (!hqIds.includes(def.id)) {
                this._renderSingleFacility(def, facilityList, guild);
            }
        });
    }

    _renderCapacityCard(container, guild) {
        const softCap = guild.softCap || 10;
        const hqCost = softCap * 100;

        const el = document.createElement('div');
        el.className = 'operation-card hero';
        el.innerHTML = `
            <h3>本部施設 (収容拡張)</h3>
            <div class="operation-header-row">
                <span>収容目安</span>
                <span class="font-bold text-xl">${softCap}名</span>
            </div>
            <div class="policy-desc">
                冒険者の拠点。規模を大きくすることで、より多くの冒険者を受け入れ可能。
            </div>
             <div class="flex-col-end gap-sm mt-auto">
                <span class="font-bold ${guild.money >= hqCost ? UI_CONSTANTS.CLASSES.SAFE : UI_CONSTANTS.CLASSES.DANGER}">増築: ${hqCost} G</span>
                <button id="btn-expand" class="btn btn-primary w-full" ${guild.money < hqCost ? 'disabled' : ''}>実行</button>
            </div>
        `;

        el.querySelector('#btn-expand')?.addEventListener('click', () => {
            if (guild.money >= hqCost) {
                guild.money -= hqCost;

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
        container.appendChild(el);
    }

    _renderSingleFacility(def, container, guild) {
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
                <div class="policy-desc min-h-3em">${def.description}</div>
                <div class="policy-effects">${def.effectDesc}</div>
                
                <div class="flex-col-end gap-sm mt-auto">
                    ${isMax
                ? '<span class="text-main-color">最大レベル</span>'
                : `<span class="font-bold ${guild.money >= cost ? UI_CONSTANTS.CLASSES.SAFE : UI_CONSTANTS.CLASSES.DANGER}">改良: ${cost} G</span>`
            }
                    ${!isMax ? `<button class="btn-build btn btn-primary w-full" data-id="${def.id}" ${guild.money < cost ? 'disabled' : ''}>${currentLv === 0 ? '建設' : '強化'}</button>` : ''}
                </div>
            `;

        // 建設/強化ボタンのバインド
        el.querySelector('.btn-build')?.addEventListener('click', () => {
            if (guild.money >= cost) {
                guild.money -= cost;

                // ログ
                if (guild.todayFinance) {
                    guild.todayFinance.expense += cost;
                    guild.todayFinance.balance = guild.money;
                    guild.todayFinance.details.push({
                        reason: `${def.name} ${currentLv === 0 ? '建設' : '強化'} (Lv.${nextLv})`,
                        amount: -cost
                    });
                }

                // レベル更新
                const key = def.id.toLowerCase();
                if (!guild.facilities) guild.facilities = {}; // 安全策
                if (!guild.facilities[key]) guild.facilities[key] = 0;
                guild.facilities[key]++;

                this.gameLoop.uiManager.log(`${def.name}を Lv.${guild.facilities[key]} に強化しました。`, 'success');
                this.gameLoop.uiManager.render();
            }
        });

        container.appendChild(el);
    }

    /**
     * 運営方針タブを描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     */
    _renderPolicy(container, guild) {
        const activePolicyId = guild.activePolicy || 'BALANCED';

        container.innerHTML = `
            <div class="mb-md">
                <div class="policy-desc">
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

            // 効果文字列
            let modStr = [];
            for (const [k, v] of Object.entries(p.mod)) {
                let val = Math.round((v - 1.0) * 100);
                let sign = val > 0 ? '+' : '';
                modStr.push(`${EFFECT_LABELS[k] || k} ${sign}${val}%`);
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

        // 変更ボタンのバインド
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
            // 特に制限なし
        }
    }

    /**
     * 顧問人事タブを描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     */
    _renderPersonnel(container, guild) {
        // レイアウト: AdventurerScreenと同じグリッド構造を使用
        container.innerHTML = '';
        container.className = 'grid-2-col-fixed-right p-md panel-reset';

        // Remove style overrides if any were lingering (though innerHTML='' clears content, wrapper styles persist if set on container)
        container.style.gap = '';
        container.style.height = '100%';
        container.style.overflow = 'hidden';

        const advisors = guild.advisors || [];

        // --- Left: List ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel flex-col h-full';
        listPanel.innerHTML = `
            <div class="panel-header text-center">顧問一覧 (${advisors.length}/${ADVISOR_CONFIG.MAX_ADVISORS})</div>
        `;

        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1 scroll-y'; // 冒険者リストコンテナと一致
        listPanel.appendChild(listContainer);

        // フッター: 外部招聘ボタン
        const footer = document.createElement('div');
        footer.className = 'mt-sm footer-actions';

        const headhuntCost = ADVISOR_CONFIG.HEADHUNT_COST || 2000;
        const canAfford = guild.money >= headhuntCost;
        const isFull = advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS;

        footer.innerHTML = `
            <button id="btn-headhunt" class="btn btn-primary w-full" ${canAfford && !isFull ? '' : 'disabled'}>
                外部招聘 (${headhuntCost}G)
            </button>
            <div class="text-xs mt-xs ${UI_CONSTANTS.CLASSES.SUB_TEXT}">即戦力の専門家を90日契約で雇用します</div>
        `;

        footer.querySelector('#btn-headhunt').addEventListener('click', () => {
            if (confirm(`外部から顧問を招聘しますか？ (費用: ${headhuntCost}G)`)) {
                if (this.gameLoop.managementService && this.gameLoop.managementService.headhuntAdvisor(guild)) {
                    this.gameLoop.uiManager.render();
                }
            }
        });

        listPanel.appendChild(footer);

        // --- Right: Detail ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel flex-col flex-1 h-full';

        // リスト描画
        this._renderAdvisorList(listContainer, advisors, detailPanel);

        // 詳細デフォルト描画
        if (advisors.length > 0) {
            if (!this.advisorState.selectedId) {
                this.advisorState.selectedId = advisors[0].id;
            }
            const selected = advisors.find(a => a.id === this.advisorState.selectedId) || advisors[0];
            this._renderAdvisorDetail(detailPanel, selected);
        } else {
            detailPanel.innerHTML = `
                <div class="p-lg text-center text-muted">
                    <p>現在、契約中の顧問はいません。</p>
                </div>
            `;
        }

        container.appendChild(listPanel);
        container.appendChild(detailPanel);
    }

    _renderAdvisorList(container, advisors, detailPanel) {
        container.innerHTML = '';
        advisors.forEach(adv => {
            const row = document.createElement('div');
            // 冒険者リストと同じクラスを使用: list-item, list-item-adventure
            row.className = `list-item list-item-adventure ${adv.id === this.advisorState.selectedId ? 'selected' : ''}`;

            const jobName = ADVENTURER_JOB_NAMES[adv.type] || adv.type;
            const effectDesc = adv.effect ? adv.effect.desc : '効果なし';

            // 冒険者アイテム構造に合わせる
            row.innerHTML = `
                <div class="list-item-header">
                    <span class="list-item-title">${adv.name}</span>
                    <span class="text-sm">(${jobName})</span>
                    ${adv.remainingContract ? `<span class="text-xs badge-adv badge-warn ml-auto">残り${adv.remainingContract}日</span>` : ''}
                </div>
                <div class="text-meta">
                   <div>Rank ${adv.rankLabel}</div>
                   <div class="${UI_CONSTANTS.CLASSES.SAFE} font-bold">${effectDesc}</div>
                </div>
            `;

            row.addEventListener('click', () => {
                this.advisorState.selectedId = adv.id;
                // 完全再描画なしで選択状態を視覚的に更新
                container.querySelectorAll('.list-item').forEach(el => el.classList.remove('selected'));
                row.classList.add('selected');

                this._renderAdvisorDetail(detailPanel, adv);
            });

            container.appendChild(row);
        });
    }

    _renderAdvisorDetail(panel, adv) {
        if (!adv) return;
        panel.innerHTML = '';

        const jobName = ADVENTURER_JOB_NAMES[adv.type] || adv.type;

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'panel-header flex-no-shrink';
        header.innerHTML = `
            <div class="flex-row flex-between flex-center">
                <span>${adv.name} <span class="text-sm font-normal">(${jobName})</span></span>
                <span class="text-sm">
                    ${adv.remainingContract ? `任期: 残り${adv.remainingContract}日` : `契約: ${adv.hiredDay || '?'}日目 (無期限)`}
                </span>
            </div>
        `;
        panel.appendChild(header);

        // タブ
        const tabs = document.createElement('div');
        tabs.className = 'tabs flex-no-shrink';
        tabs.innerHTML = `
            <button class="tab ${this.advisorState.detailTab === UI_CONSTANTS.ADVISOR_TABS.EFFECT ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.EFFECT}">効果・給与</button>
            <button class="tab ${this.advisorState.detailTab === UI_CONSTANTS.ADVISOR_TABS.STATUS ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.STATUS}">ステータス</button>
            <button class="tab ${this.advisorState.detailTab === UI_CONSTANTS.ADVISOR_TABS.HISTORY ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.HISTORY}">経歴</button>
            <button class="tab ${this.advisorState.detailTab === UI_CONSTANTS.ADVISOR_TABS.MEIKAN ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.MEIKAN}">名鑑</button>
        `;
        panel.appendChild(tabs);

        // コンテンツ
        const content = document.createElement('div');
        content.className = 'scroll-y flex-1 p-sm';
        panel.appendChild(content);

        this._renderAdvisorTabContent(content, adv);

        tabs.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.advisorState.detailTab = btn.dataset.tab;

                // Active class toggle
                tabs.querySelectorAll('.tab').forEach(b => b.classList.remove(UI_CONSTANTS.CLASSES.ACTIVE));
                btn.classList.add(UI_CONSTANTS.CLASSES.ACTIVE);

                this._renderAdvisorTabContent(content, adv);
            });
        });
    }

    _renderAdvisorTabContent(container, adv) {
        container.innerHTML = ''; // Clear previous content
        switch (this.advisorState.detailTab) {
            case UI_CONSTANTS.ADVISOR_TABS.EFFECT:
                this._renderAdvisorEffectTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.STATUS:
                this._renderAdvisorStatusTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.HISTORY:
                this._renderAdvisorHistoryTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.MEIKAN:
                this._renderAdvisorMeikanTab(container, adv);
                break;
        }
    }

    _renderAdvisorEffectTab(container, adv) {
        const desc = adv.effect ? adv.effect.desc : '効果なし';

        // 重複減衰の計算
        const guild = this.guild; // キャッシュ
        const sameTypeAdvisors = guild.advisors.filter(a => a.type === adv.type);
        const index = sameTypeAdvisors.findIndex(a => a.id === adv.id);
        const factor = 1 / Math.pow(2, index);
        const efficiency = factor * 100;

        container.innerHTML = `
            <div class="card p-md">
                <div class="info-row">
                    <span class="label">発動効果:</span>
                    <span class="value font-bold text-lg">${desc}</span>
                </div>
                <div class="info-row">
                    <span class="label">現在の効果率:</span>
                    <span class="value ${factor < 1 ? UI_CONSTANTS.CLASSES.WARNING : UI_CONSTANTS.CLASSES.SAFE}">${efficiency}%</span>
                </div>
                ${factor < 1 ? `<div class="text-sm ${UI_CONSTANTS.CLASSES.WARNING} mt-sm">※ 同職の顧問が複数いるため効果が減衰しています (${index + 1}人目)</div>` : ''}
                
                <hr class="separator">
                
                <div class="info-row">
                    <span class="label">契約賃金:</span>
                    <span class="value">${ADVISOR_CONFIG.SALARY} G / 30日</span>
                </div>
                 <div class="text-xs ${UI_CONSTANTS.CLASSES.SUB_TEXT} mt-sm">
                    顧問契約は終身雇用です。原則として解雇はできません。
                </div>
            </div>
        `;
    }

    _renderAdvisorStatusTab(container, adv) {
        // 基本情報
        const originName = (adv.origin && adv.origin.name) ? adv.origin.name : (adv.origin ? adv.origin.id : '不明');

        const info = document.createElement('div');
        info.innerHTML = `
            <div class="sub-header">基本情報</div>
            <p>職業: ${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</p>
            <p>出身地: ${originName}</p>
            <p>雇用形態: ${adv.joinType ? (JOIN_TYPE_NAMES[adv.joinType] || adv.joinType) : '特別契約'}</p>
            <p>契約日: ${adv.hiredDay || '?'}日目</p>
            <hr>
            <div class="sub-header">評価</div>
            <p>ランク: <b>${adv.rankLabel}</b> (評価値 ${Math.floor(adv.rankValue || 0)})</p>
            <p>信頼度: ${adv.trust || 0}</p>
             <p>調子(EMA): ${(adv.perfEMA || 0).toFixed(2)}</p>
        `;
        container.appendChild(info);

        // ステータス (バー)
        const stats = adv.stats || {};
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `<div class="sub-header">能力値</div>`;
        for (const [key, val] of Object.entries(stats)) {
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

        // 気質・特性
        const t = adv.temperament || { risk: 0, greed: 0, social: 0 };
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `
            <div class="sub-header">気質・特性</div>
            <div class="text-sm">
                危険志向: ${t.risk > 0 ? '+' + t.risk : t.risk}<br>
                金銭欲: ${t.greed > 0 ? '+' + t.greed : t.greed}<br>
                社交性: ${t.social > 0 ? '+' + t.social : t.social}
            </div>
            <div class="mt-sm">
                ${(adv.traits || []).map(tKey => {
            const tr = TRAITS[tKey];
            return tr ? `<span class="trait-tag" title="${tr.effects}">[${tr.name}]</span>` : '';
        }).join(' ')}
            </div>
        `;
        container.appendChild(tempDiv);

        // 装備
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

        // 奥義
        const artsDiv = document.createElement('div');
        artsDiv.innerHTML = `<div class="sub-header">習得奥義</div>`;
        if (adv.arts && adv.arts.length > 0) {
            artsDiv.innerHTML += `<div class="flex-wrap-gap-xs">
                ${adv.arts.map(art => `
                    <div class="art-tag">
                        ⚡ ${art.name}
                    </div>
                `).join('')}
            </div>`;
        } else {
            artsDiv.innerHTML += `<div class="text-sm text-muted">なし</div>`;
        }
        container.appendChild(artsDiv);
    }

    _renderAdvisorHistoryTab(container, adv) {
        const list = document.createElement('div');

        if (!adv.history || adv.history.length === 0) {
            list.innerHTML = `<div class="empty-state ${UI_CONSTANTS.CLASSES.SUB_TEXT} p-md">${UI_CONSTANTS.MESSAGES.EMPTY_STATE}</div>`;
        } else {
            // 冒険者画面/アーカイブと同じタイムラインスタイル
            list.innerHTML = adv.history.map(h => `
                <div class="history-item">
                    <div class="history-dot"></div>
                    <div class="text-meta">Day ${h.day || '?'}</div>
                    <div class="text-wood">${h.text || h}</div>
                </div>
            `).join('');
        }
        container.appendChild(list);

        // 統計サマリー
        const statsSummary = document.createElement('div');
        statsSummary.className = 'stats-summary-box';

        let achievementHtml = "";
        if (adv.records && adv.records.majorAchievements && adv.records.majorAchievements.length > 0) {
            achievementHtml = adv.records.majorAchievements.map(a =>
                `<div><span class="text-meta">[Day${a.day}]</span> <span class="font-bold">${a.title}</span> <span class="text-xs text-accent-dangerous">(Rank ${a.rank})</span></div>`
            ).join('');
        } else {
            achievementHtml = '<div class="text-muted text-sm">なし</div>';
        }

        let battleHtml = "";
        if (adv.records && adv.records.majorKills && adv.records.majorKills.length > 0) {
            battleHtml = adv.records.majorKills.map(k =>
                `<div><span class="text-meta">[Day${k.day}]</span> <span class="font-bold">${k.name}</span> <span class="text-xs text-accent-red-bright">(Rank ${k.rank}${k.isBoss ? ' BOSS' : ''})</span></div>`
            ).join('');
        } else {
            battleHtml = '<div class="text-muted text-sm">なし</div>';
        }

        statsSummary.innerHTML = `
            <div class="text-sm font-bold stats-summary-header">主な功績</div>
            <div class="text-sm" style="margin-bottom:1rem;">
                ${achievementHtml}
            </div>

            <div class="text-sm font-bold stats-summary-header">主な戦績 (討伐ランク順)</div>
            <div class="text-sm">
                ${battleHtml}
            </div>
        `;
        container.appendChild(statsSummary);
    }

    _renderAdvisorMeikanTab(container, adv) {
        const bio = adv.bio || {};
        const createSection = (title, content, isItalic = false) => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';
            let htmlContent = '';
            if (Array.isArray(content)) {
                htmlContent = content.map(line => `<p class="meikan-text">${line}</p>`).join('');
            } else {
                htmlContent = `<p class="meikan-text">${content}</p>`;
            }
            if (isItalic) htmlContent = `<div class="text-italic-muted">${htmlContent}</div>`;
            return `
                <div class="mb-lg">
                    <div class="sub-header border-bottom-soft text-sub-color">${title}</div>
                    <div class="font-serif-padded">
                        ${htmlContent}
                    </div>
                </div>
             `;
        };

        let html = '<div class="p-sm">';
        html += createSection('人物', bio.intro);
        if (bio.arts && bio.arts.length > 0) html += createSection('奥義・魔法', bio.arts);
        if (bio.traits && bio.traits.length > 0) html += createSection('特性・人柄', bio.traits);
        if (bio.career && bio.career.length > 0) html += createSection('主な経歴', bio.career);
        if (bio.nickname) html += createSection('二つ名', bio.nickname);
        if (bio.flavor) html += createSection('評価', bio.flavor, true);
        if (html === '<div class="p-sm">') html += '<div class="text-muted p-md">まだ記録された情報はありません。</div>';
        html += '</div>';
        container.innerHTML = html;
    }

    _renderAdvisorTabContent(container, adv) {
        container.innerHTML = '';
        switch (this.advisorState.detailTab) {
            case 'EFFECT':
                this._renderAdvisorEffectTab(container, adv);
                break;
            case 'STATUS':
                this._renderAdvisorStatusTab(container, adv);
                break;
            case 'HISTORY':
                this._renderAdvisorHistoryTab(container, adv);
                break;
            case 'MEIKAN':
                this._renderAdvisorMeikanTab(container, adv);
                break;
        }
    }

    _renderAdvisorEffectTab(container, adv) {
        const desc = adv.effect ? adv.effect.desc : '効果なし';

        // 重複減衰の計算
        const guild = this.guild; // キャッシュ
        const sameTypeAdvisors = guild.advisors.filter(a => a.type === adv.type);
        const index = sameTypeAdvisors.findIndex(a => a.id === adv.id);
        const factor = 1 / Math.pow(2, index);
        const efficiency = factor * 100;

        container.innerHTML = `
            <div class="card p-md">
                <div class="info-row">
                    <span class="label">発動効果:</span>
                    <span class="value font-bold text-lg">${desc}</span>
                </div>
                <div class="info-row">
                    <span class="label">現在の効果率:</span>
                    <span class="value ${factor < 1 ? 'text-warning' : 'text-success'}">${efficiency}%</span>
                </div>
                ${factor < 1 ? `<div class="text-sm text-warning mt-sm">※ 同職の顧問が複数いるため効果が減衰しています (${index + 1}人目)</div>` : ''}
                
                <hr class="separator">
                
                <div class="info-row">
                    <span class="label">契約賃金:</span>
                    <span class="value">${ADVISOR_CONFIG.SALARY} G / 30日</span>
                </div>
                 <div class="text-xs text-muted mt-sm">
                    顧問契約は終身雇用です。原則として解雇はできません。
                </div>
            </div>
        `;
    }

    _renderAdvisorStatusTab(container, adv) {
        // 基本情報
        const originName = (adv.origin && adv.origin.name) ? adv.origin.name : (adv.origin ? adv.origin.id : '不明');

        const info = document.createElement('div');
        info.innerHTML = `
            <div class="sub-header">基本情報</div>
            <p>職業: ${ADVENTURER_JOB_NAMES[adv.type] || adv.type}</p>
            <p>出身地: ${originName}</p>
            <p>雇用形態: ${adv.joinType ? (JOIN_TYPE_NAMES[adv.joinType] || adv.joinType) : '特別契約'}</p>
            <p>契約日: ${adv.hiredDay || '?'}日目</p>
            <hr>
            <div class="sub-header">評価</div>
            <p>ランク: <b>${adv.rankLabel}</b> (評価値 ${Math.floor(adv.rankValue || 0)})</p>
            <p>信頼度: ${adv.trust || 0}</p>
             <p>調子(EMA): ${(adv.perfEMA || 0).toFixed(2)}</p>
        `;
        container.appendChild(info);

        // ステータス (バー)
        const stats = adv.stats || {};
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `<div class="sub-header">能力値</div>`;
        for (const [key, val] of Object.entries(stats)) {
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

        // 気質・特性
        const t = adv.temperament || { risk: 0, greed: 0, social: 0 };
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = `
            <div class="sub-header">気質・特性</div>
            <div class="text-sm">
                危険志向: ${t.risk > 0 ? '+' + t.risk : t.risk}<br>
                金銭欲: ${t.greed > 0 ? '+' + t.greed : t.greed}<br>
                社交性: ${t.social > 0 ? '+' + t.social : t.social}
            </div>
            <div class="mt-sm">
                ${(adv.traits || []).map(tKey => {
            const tr = TRAITS[tKey];
            return tr ? `<span class="trait-tag" title="${tr.effects}">[${tr.name}]</span>` : '';
        }).join(' ')}
            </div>
        `;
        container.appendChild(tempDiv);

        // 装備
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

        // 奥義
        const artsDiv = document.createElement('div');
        artsDiv.innerHTML = `<div class="sub-header">習得奥義</div>`;
        if (adv.arts && adv.arts.length > 0) {
            artsDiv.innerHTML += `<div class="flex-wrap-gap-xs">
                ${adv.arts.map(art => `
                    <div class="art-tag">
                        ⚡ ${art.name}
                    </div>
                `).join('')}
            </div>`;
        } else {
            artsDiv.innerHTML += `<div class="text-sm text-muted">なし</div>`;
        }
        container.appendChild(artsDiv);
    }

    _renderAdvisorHistoryTab(container, adv) {
        const list = document.createElement('div');

        if (!adv.history || adv.history.length === 0) {
            list.innerHTML = '<div class="empty-state text-muted p-md">特筆すべき出来事はまだありません</div>';
        } else {
            // 冒険者画面/アーカイブと同じタイムラインスタイル
            list.innerHTML = adv.history.map(h => `
                <div class="history-item">
                    <div class="history-dot"></div>
                    <div class="text-meta">Day ${h.day || '?'}</div>
                    <div class="text-wood">${h.text || h}</div>
                </div>
            `).join('');
        }
        container.appendChild(list);

        // 統計サマリー
        const statsSummary = document.createElement('div');
        statsSummary.className = 'stats-summary-box';

        let achievementHtml = "";
        if (adv.records && adv.records.majorAchievements && adv.records.majorAchievements.length > 0) {
            achievementHtml = adv.records.majorAchievements.map(a =>
                `<div><span class="text-meta">[Day${a.day}]</span> <span class="font-bold">${a.title}</span> <span class="text-xs text-accent-dangerous">(Rank ${a.rank})</span></div>`
            ).join('');
        } else {
            achievementHtml = '<div class="text-muted text-sm">なし</div>';
        }

        let battleHtml = "";
        if (adv.records && adv.records.majorKills && adv.records.majorKills.length > 0) {
            battleHtml = adv.records.majorKills.map(k =>
                `<div><span class="text-meta">[Day${k.day}]</span> <span class="font-bold">${k.name}</span> <span class="text-xs text-accent-red-bright">(Rank ${k.rank}${k.isBoss ? ' BOSS' : ''})</span></div>`
            ).join('');
        } else {
            battleHtml = '<div class="text-muted text-sm">なし</div>';
        }

        statsSummary.innerHTML = `
            <div class="text-sm font-bold stats-summary-header">主な功績</div>
            <div class="text-sm" style="margin-bottom:1rem;">
                ${achievementHtml}
            </div>

            <div class="text-sm font-bold stats-summary-header">主な戦績 (討伐ランク順)</div>
            <div class="text-sm">
                ${battleHtml}
            </div>
        `;
        container.appendChild(statsSummary);
    }

    _renderAdvisorMeikanTab(container, adv) {
        const bio = adv.bio || {};
        const createSection = (title, content, isItalic = false) => {
            if (!content || (Array.isArray(content) && content.length === 0)) return '';
            let htmlContent = '';
            if (Array.isArray(content)) {
                htmlContent = content.map(line => `<p class="meikan-text">${line}</p>`).join('');
            } else {
                htmlContent = `<p class="meikan-text">${content}</p>`;
            }
            if (isItalic) htmlContent = `<div class="text-italic-muted">${htmlContent}</div>`;
            return `
                <div class="mb-lg">
                    <div class="sub-header border-bottom-soft text-sub-color">${title}</div>
                    <div class="font-serif-padded">
                        ${htmlContent}
                    </div>
                </div>
             `;
        };

        let html = '<div class="p-sm">';
        html += createSection('人物', bio.intro);
        if (bio.arts && bio.arts.length > 0) html += createSection('奥義・魔法', bio.arts);
        if (bio.traits && bio.traits.length > 0) html += createSection('特性・人柄', bio.traits);
        if (bio.career && bio.career.length > 0) html += createSection('主な経歴', bio.career);
        if (bio.nickname) html += createSection('二つ名', bio.nickname);
        if (bio.flavor) html += createSection('評価', bio.flavor, true);
        if (html === '<div class="p-sm">') html += '<div class="text-muted p-md">まだ記録された情報はありません。</div>';
        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * 広報活動タブを描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     */
    _renderPR(container, guild) {
        // 実施中のキャンペーンがあるか確認
        const activeCampaign = guild.activeEvents.find(e => CAMPAIGNS[e.id]);

        // Header
        const header = document.createElement('div');
        header.innerHTML = `
            <div class="policy-desc mb-md">
                ギルドの資金を使って、様々なキャンペーンを実施できます。<br>
                キャンペーンは一度に1つしか実施できません。期間中は特別な効果が得られます。
            </div>
            ${activeCampaign ? `
                <div class="operation-card hero mb-lg">
                    <h3>現在実施中のキャンペーン</h3>
                    <div class="operation-header-row">
                        <span class="font-bold text-lg">${activeCampaign.name}</span>
                        <span class="status-badge bg-accent text-wood">実施中</span>
                    </div>
                    <div class="policy-desc">${activeCampaign.description}</div>
                    <div class="text-right mt-md">残り ${activeCampaign.remainingDays} 日</div>
                </div>
            ` : `
                 <div class="operation-card mb-lg card-empty-dashed">
                    <h3 class="text-sub-color">キャンペーン未実施</h3>
                    <div class="policy-desc">現在実施中のキャンペーンはありません。</div>
                </div>
            `}
            <h3 class="section-header">実施可能なキャンペーン</h3>
        `;

        container.innerHTML = '';
        container.appendChild(header);

        const list = document.createElement('div');
        list.className = 'operation-grid';

        Object.values(CAMPAIGNS).forEach(cmp => {
            // 実施中ならスキップ (または無効表示)
            const isActive = activeCampaign && activeCampaign.id === cmp.id;
            const isOtherActive = activeCampaign && !isActive;

            const el = document.createElement('div');
            el.className = `operation-card ${isActive ? 'hero' : ''}`;

            el.innerHTML = `
                <div class="operation-header-row">
                    <span class="font-bold">${cmp.name}</span>
                    <span class="text-sm font-bold">${cmp.cost} G</span>
                </div>
                <div class="policy-desc min-h-3em">${cmp.description}</div>
                <div class="policy-effects">${cmp.effectDesc}</div>
                
                <div class="flex-col-end gap-sm mt-auto">
                    <button class="btn-start-campaign btn btn-primary w-full" 
                        data-id="${cmp.id}" 
                        ${isOtherActive || isActive || guild.money < cmp.cost ? 'disabled' : ''}>
                        ${isActive ? '実施中' : '実施'}
                    </button>
                </div>
             `;

            el.querySelector('.btn-start-campaign').addEventListener('click', () => {
                this._startCampaign(guild, cmp);
            });

            list.appendChild(el);
        });

        container.appendChild(list);
    }

    /**
     * キャンペーンを開始します。
     * @param {object} guild 
     * @param {object} cmp 
     */
    _startCampaign(guild, cmp) {
        if (guild.money < cmp.cost) return;

        // 実施中か再確認
        if (guild.activeEvents.some(e => CAMPAIGNS[e.id])) return;

        guild.money -= cmp.cost;

        // 財務ログ
        if (guild.todayFinance) {
            guild.todayFinance.expense += cmp.cost;
            guild.todayFinance.balance = guild.money;
            guild.todayFinance.details.push({
                reason: `広報活用: ${cmp.name}`,
                amount: -cmp.cost
            });
        }

        // イベントとして追加
        guild.activeEvents.push({
            id: cmp.id,
            name: cmp.name,
            description: cmp.description,
            mod: cmp.mod,
            remainingDays: cmp.duration
        });

        this.gameLoop.uiManager.log(`${cmp.name}を開始しました。(期間: ${cmp.duration}日)`, 'success');

        // メール送信 (任意、重要なら)
        // 現状はログのみ
        // 非常に重要でない限りログで十分

        this.gameLoop.uiManager.render();
    }

    /**
     * システムタブを描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     */
    _renderSystem(container, guild) {
        container.innerHTML = `
            <div class="panel p-md">
                <h3 class="section-header">データ管理</h3>
                <div class="mb-lg">
                    <div class="text-sm mb-sm">
                        ゲームデータは毎日自動的にブラウザに保存されますが、<br>
                        以下の機能を使って手動でバックアップ（文字列での書き出し・読み込み）が可能です。
                    </div>
                </div>

                <div class="operation-grid">
                    <!-- Export Card -->
                    <div class="operation-card">
                        <h4 class="font-bold mb-sm">セーブデータの書き出し (Export)</h4>
                        <p class="text-xs text-muted mb-sm">このコードをコピーして、テキストファイル等に保存してください。</p>
                        <textarea id="export-area" readonly class="textarea-code"></textarea>
                        <div class="text-right mt-auto">
                            <button id="btn-copy" class="btn btn-primary">クリップボードにコピー</button>
                        </div>
                    </div>

                    <!-- Import Card -->
                    <div class="operation-card">
                        <h4 class="font-bold mb-sm">セーブデータの読み込み (Import)</h4>
                        <p class="text-xs text-muted mb-sm">保存したセーブコードを貼り付けてください。現在のデータは上書きされます。</p>
                        <textarea id="import-area" class="textarea-code"></textarea>
                        <div class="text-right mt-auto">
                            <button id="btn-import" class="btn btn-primary">データを読み込む</button>
                        </div>
                    </div>

                    <!-- Reset Card -->
                    <div class="operation-card border-danger">
                        <h4 class="font-bold text-danger mb-sm">データリセット</h4>
                        <p class="text-xs text-muted mb-sm">
                            ブラウザに保存されている自動セーブデータを完全に削除し、ゲームを初期状態に戻します。<br>
                            <span class="text-danger font-bold">この操作は取り消せません。</span>
                        </p>
                        <div class="text-right mt-auto">
                            <button id="btn-reset" class="btn btn-danger">全データを削除してリセット</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Export Logic
        const exportArea = container.querySelector('#export-area');
        if (this.gameLoop.storageService) {
            // Generate Code
            const code = this.gameLoop.storageService.exportData(this.gameLoop);
            if (code) {
                exportArea.value = code;
            } else {
                exportArea.value = "エラー: データの生成に失敗しました。";
            }
        }

        container.querySelector('#btn-copy').addEventListener('click', () => {
            exportArea.select();
            document.execCommand('copy');
            this.gameLoop.uiManager.log("セーブコードをクリップボードにコピーしました。", "success");
        });

        // Import Logic
        const importArea = container.querySelector('#import-area');
        container.querySelector('#btn-import').addEventListener('click', () => {
            const code = importArea.value.trim();
            if (!code) return;

            if (confirm("現在のデータを上書きしてロードしますか？\\n（未保存の進行状況は失われます）")) {
                if (this.gameLoop.storageService && this.gameLoop.storageService.importData(code, this.gameLoop)) {
                    this.gameLoop.uiManager.log("データの読み込みに成功しました。ページをリロードします...", "success");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.gameLoop.uiManager.log("データの読み込みに失敗しました。コードが正しいか確認してください。", "error");
                }
            }
        });

        // Reset Logic
        container.querySelector('#btn-reset').addEventListener('click', () => {
            if (confirm("本当にデータを削除してリセットしますか？\\nこの操作は元に戻せません。")) {
                if (this.gameLoop.storageService) {
                    this.gameLoop.storageService.reset();
                    this.gameLoop.uiManager.log("データを削除しました。初期状態に戻ります...", "warning");
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }
        });
    }
}

