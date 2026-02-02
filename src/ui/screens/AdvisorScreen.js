import { ADVISOR_CONFIG, ADVENTURER_JOB_NAMES, TRAITS, JOIN_TYPE_NAMES } from '../../data/constants.js';
import { UI_CONSTANTS } from '../../data/ui_constants.js';

/**
 * 顧問一覧・詳細画面クラス
 */
export class AdvisorScreen {
    /**
     * コンストラクタ
     * @param {UIManager} uiManager 
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.state = {
            selectedAdvisorId: null,
            currentDetailTab: UI_CONSTANTS.ADVISOR_TABS.EFFECT // 効果, ステータス, 経歴, 名鑑
        };
    }

    /**
     * 画面を描画します。
     * @param {HTMLElement} container 
     */
    render(container) {
        const guild = this.uiManager.gameLoop.guild;
        const advisors = guild.advisors || [];

        // スクロール位置の保持
        let lastScrollTop = 0;
        const existingList = container.querySelector('.scroll-list');
        if (existingList) lastScrollTop = existingList.scrollTop;

        container.innerHTML = '';
        container.classList.add('screen-content');

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'screen-header flex-row flex-between flex-center';
        header.innerHTML = `
            <h2>顧問団 (契約: ${advisors.length} / ${ADVISOR_CONFIG.MAX_ADVISORS})</h2>
            <button class="btn close-btn">閉じる</button>
        `;
        header.querySelector('.close-btn').addEventListener('click', () => {
            this.uiManager.popScreen();
        });
        container.appendChild(header);

        // コンテンツ (2カラム)
        const content = document.createElement('div');
        content.className = 'screen-content-wrapper';

        // --- 左: リスト ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel flex-col side-panel-sm';

        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list flex-1 scroll-y';
        listPanel.appendChild(listContainer);

        // スクロール位置の復元
        if (lastScrollTop > 0) {
            setTimeout(() => {
                listContainer.scrollTop = lastScrollTop;
            }, 0);
        }

        // --- 右: 詳細 ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel flex-col flex-1';

        // リスト描画
        this._renderList(listContainer, advisors, detailPanel);

        // 右パネルの初期設定
        if (advisors.length > 0) {
            if (!this.state.selectedAdvisorId) {
                this.state.selectedAdvisorId = advisors[0].id;
            }
            const selected = advisors.find(a => a.id === this.state.selectedAdvisorId) || advisors[0];
            this._renderDetail(detailPanel, selected);
        } else {
            detailPanel.innerHTML = '<div class="p-md text-center text-muted">顧問はいません。<br>引退した熟練冒険者が志願してくることがあります。</div>';
        }

        content.appendChild(listPanel);
        content.appendChild(detailPanel);
        container.appendChild(content);
    }

    _renderList(container, advisors, detailPanel) {
        container.innerHTML = '';
        if (advisors.length === 0) return;

        advisors.forEach(adv => {
            const row = document.createElement('div');
            row.className = `list-item flex-row flex-center p-sm advisor-row ${adv.id === this.state.selectedAdvisorId ? 'selected' : ''}`;

            const jobName = ADVENTURER_JOB_NAMES[adv.type] || adv.type;
            row.innerHTML = `
                <div class="flex-col">
                    <span class="font-bold">${adv.name}</span>
                    <span class="text-sm text-muted">${jobName} (ランク${adv.rankLabel})</span>
                </div>
                <div class="text-sm text-info">
                    ${adv.effect ? adv.effect.desc.split(' ')[0] : ''}
                </div>
            `;

            row.addEventListener('click', () => {
                this.state.selectedAdvisorId = adv.id;
                this._renderList(container, advisors, detailPanel); // 選択更新のため再描画
                this._renderDetail(detailPanel, adv);
            });

            container.appendChild(row);
        });
    }

    _renderDetail(panel, adv) {
        if (!adv) return;
        panel.innerHTML = '';

        const jobName = ADVENTURER_JOB_NAMES[adv.type] || adv.type;

        // ヘッダー
        const header = document.createElement('div');
        header.className = 'panel-header flex-no-shrink';
        header.innerHTML = `
            <div class="flex-row flex-between flex-center">
                <span>${adv.name} <span class="text-sm font-normal">(${jobName})</span></span>
                <span class="text-sm">顧問契約日: ${adv.hiredDay}日目</span>
            </div>
        `;
        panel.appendChild(header);

        // タブ
        const tabs = document.createElement('div');
        tabs.className = 'tabs flex-no-shrink';
        tabs.innerHTML = `
            <button class="tab ${this.state.currentDetailTab === UI_CONSTANTS.ADVISOR_TABS.EFFECT ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.EFFECT}">顧問効果</button>
            <button class="tab ${this.state.currentDetailTab === UI_CONSTANTS.ADVISOR_TABS.STATUS ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.STATUS}">ステータス</button>
            <button class="tab ${this.state.currentDetailTab === UI_CONSTANTS.ADVISOR_TABS.HISTORY ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.HISTORY}">経歴</button>
            <button class="tab ${this.state.currentDetailTab === UI_CONSTANTS.ADVISOR_TABS.MEIKAN ? UI_CONSTANTS.CLASSES.ACTIVE : ''}" data-tab="${UI_CONSTANTS.ADVISOR_TABS.MEIKAN}">名鑑</button>
        `;
        panel.appendChild(tabs);

        // コンテンツエリア
        const content = document.createElement('div');
        content.className = 'scroll-y flex-1 p-sm';
        panel.appendChild(content);

        this._renderTabContent(content, adv);

        tabs.querySelectorAll('.tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.state.currentDetailTab = btn.dataset.tab;
                this._renderDetail(panel, adv); // パネル全体を再描画
            });
        });
    }

    _renderTabContent(container, adv) {
        switch (this.state.currentDetailTab) {
            case UI_CONSTANTS.ADVISOR_TABS.EFFECT:
                this._renderEffectTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.STATUS:
                this._renderStatusTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.HISTORY:
                this._renderHistoryTab(container, adv);
                break;
            case UI_CONSTANTS.ADVISOR_TABS.MEIKAN:
                this._renderMeikanTab(container, adv);
                break;
        }
    }

    _renderEffectTab(container, adv) {
        const desc = adv.effect ? adv.effect.desc : '効果なし';

        // 重複減衰の計算（表示用）
        const guild = this.uiManager.gameLoop.guild;
        const sameTypeAdvisors = guild.advisors.filter(a => a.type === adv.type);
        const index = sameTypeAdvisors.findIndex(a => a.id === adv.id); // 0-based
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
                    <span class="value ${factor < 1 ? UI_CONSTANTS.CLASSES.WARN : UI_CONSTANTS.CLASSES.SAFE}">${efficiency}%</span>
                </div>
                ${factor < 1 ? `<div class="text-sm ${UI_CONSTANTS.CLASSES.WARN} mt-sm">※ 同職の顧問が複数いるため効果が減衰しています (${index + 1}人目)</div>` : ''}
                
                <hr class="separator">
                
                <div class="info-row">
                    <span class="label">契約賃金:</span>
                    <span class="value">${ADVISOR_CONFIG.SALARY} G / 30日</span>
                </div>
                 <div class="text-xs ${UI_CONSTANTS.CLASSES.SUB_TEXT} mt-sm">
                    顧問契約は終身雇用です。解雇はできません。
                </div>
            </div>
        `;
    }

    // 冒険者画面/アーカイブ画面のロジックを再利用
    // 簡易版の実装

    _renderStatusTab(container, adv) {
        // ... (Status rendering similar to AdventurerScreen) ...
        const stats = adv.stats || {};
        const originName = (adv.origin && adv.origin.name) ? adv.origin.name : '不明';

        container.innerHTML = `
            <div class="card p-sm mb-sm">
                <div class="info-row"><span class="label">出身:</span> <span>${originName}</span></div>
                <div class="info-row"><span class="label">ランク:</span> <span>${adv.rankLabel} (評価値:${Math.floor(adv.rankValue || 0)})</span></div>
            </div>
            
            <div class="card p-sm">
                <div class="section-title">能力値</div>
                <div class="stats-grid grid-2-col">
                    <div class="stat-item"><span class="label">STR:</span> ${stats.STR || 0}</div>
                    <div class="stat-item"><span class="label">VIT:</span> ${stats.VIT || 0}</div>
                    <div class="stat-item"><span class="label">MAG:</span> ${stats.MAG || 0}</div>
                    <div class="stat-item"><span class="label">DEX:</span> ${stats.DEX || 0}</div>
                    <div class="stat-item"><span class="label">INT:</span> ${stats.INT || 0}</div>
                    <div class="stat-item"><span class="label">CHA:</span> ${stats.CHA || 0}</div>
                </div>
            </div>
        `;
    }

    _renderHistoryTab(container, adv) {
        if (!adv.history || adv.history.length === 0) {
            container.innerHTML = '<div class="text-muted">主要な経歴はありません。</div>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'history-list';
        // 逆順表示?
        [...adv.history].reverse().forEach(h => {
            const li = document.createElement('li');
            li.textContent = h.text || h; // 文字列またはオブジェクトを処理
            // オブジェクト形式: {day, text}
            if (h.day !== undefined) {
                li.textContent = `Day ${h.day}: ${h.text}`;
            }
            ul.appendChild(li);
        });
        container.appendChild(ul);
    }

    _renderMeikanTab(container, adv) {
        // 名鑑 (人物) ロジック
        const bio = adv.bio || {};
        container.innerHTML = `
            <div class="card p-md">
                <p>${bio.intro || '記録なし'}</p>
                <div class="mt-md">
                    <div class="info-row"><span class="label">通算クエスト:</span> <span>${bio.careerData ? bio.careerData.questCount : 0}回</span></div>
                    <div class="info-row"><span class="label">最大討伐:</span> <span>${bio.careerData && bio.careerData.topMonster ? bio.careerData.topMonster : 'なし'}</span></div>
                </div>
            </div>
         `;
    }
}
