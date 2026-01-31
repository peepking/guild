import { TRAITS, ADVENTURER_JOB_NAMES } from '../../data/constants.js';

export class QuestScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.state = {
            selectedQuestId: null,
            selectionMode: false,
            selectedAdventurerIds: [],
            currentTab: 'NORMAL' // 'NORMAL' | 'SPECIAL'
        };
    }

    render(container, guild, globalState) {
        // 描画前のスクロール位置を保持
        let lastScrollTop = 0;
        const existingList = container.querySelector('.scroll-list');
        if (existingList) {
            lastScrollTop = existingList.scrollTop;
        }

        // 手動選択リストのスクロール位置を保持 (右パネル)
        let manualScrollTop = 0;
        const manualList = container.querySelector('#adv-select-list');
        if (manualList) {
            manualScrollTop = manualList.scrollTop;
        }

        container.innerHTML = '';
        container.classList.add('grid-2-col-fixed-right', 'gap-md');

        // --- 左: 掲示板 ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel p-sm';

        // タブ
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs mb-sm';

        const createTab = (id, label) => {
            const btn = document.createElement('button');
            btn.className = `tab ${this.state.currentTab === id ? 'active' : ''}`;
            btn.textContent = label;
            btn.onclick = () => {
                this.state.currentTab = id;
                this.state.selectedQuestId = null;
                this.state.selectionMode = false;
                this.render(container, guild, globalState);
            };
            return btn;
        };

        tabsContainer.appendChild(createTab('NORMAL', '通常依頼'));
        tabsContainer.appendChild(createTab('SPECIAL', '特殊依頼'));
        listPanel.appendChild(tabsContainer);

        // リストエリア
        const listContainer = document.createElement('div');
        listContainer.className = 'scroll-list';

        const allAssignments = this.gameLoop.ongoingQuests;
        const allPlanned = this.gameLoop.plannedQuests || [];
        const allActive = this.gameLoop.activeQuests;

        let displayAssigns = [];
        let displayPlanned = [];
        let displayActive = [];

        if (this.state.currentTab === 'SPECIAL') {
            displayAssigns = allAssignments.filter(a => a.quest.isSpecial);
            displayPlanned = allPlanned.filter(a => a.quest.isSpecial);
            displayActive = allActive.filter(q => q.isSpecial);
        } else {
            displayAssigns = allAssignments.filter(a => !a.quest.isSpecial);
            displayPlanned = allPlanned.filter(a => !a.quest.isSpecial);
            displayActive = allActive.filter(q => !q.isSpecial);
        }

        // 準備中 (Planned) の描画
        if (displayPlanned.length > 0) {
            const h = document.createElement('div');
            h.className = 'list-header';
            h.textContent = '準備中';
            // 背景色はリクエストにより削除済み
            listContainer.appendChild(h);

            displayPlanned.forEach(a => {
                const el = this._createQuestItem(a.quest, a, true); // true = isPlanning
                el.onclick = () => {
                    this.state.selectedQuestId = a.quest.id;
                    this.state.selectionMode = false;
                    this.render(container, guild, globalState);
                };
                listContainer.appendChild(el);
            });
        }

        // 遂行中 (Ongoing) の描画
        if (displayAssigns.length > 0) {
            const h = document.createElement('div');
            h.className = 'list-header';
            h.textContent = '遂行中';
            listContainer.appendChild(h);

            displayAssigns.forEach(a => {
                const el = this._createQuestItem(a.quest, a, false);
                el.onclick = () => {
                    this.state.selectedQuestId = a.quest.id;
                    this.state.selectionMode = false;
                    this.render(container, guild, globalState);
                };
                listContainer.appendChild(el);
            });
        }

        // 募集中 (Active) の描画
        const h = document.createElement('div');
        h.className = 'list-header';
        h.textContent = '募集中';
        listContainer.appendChild(h);

        displayActive.sort((a, b) => {
            const ranks = ['S', 'A', 'B', 'C', 'D', 'E'];
            return ranks.indexOf(a.difficulty.rank) - ranks.indexOf(b.difficulty.rank);
        });

        if (displayActive.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = '依頼はありません';
            empty.style.color = '#777';
            empty.style.textAlign = 'center';
            empty.style.padding = '2rem';
            listContainer.appendChild(empty);
        } else {
            displayActive.forEach(q => {
                const el = this._createQuestItem(q, null);
                el.onclick = () => {
                    this.state.selectedQuestId = q.id;
                    this.state.selectionMode = false;
                    this.render(container, guild, globalState);
                };
                listContainer.appendChild(el);
            });
        }

        listPanel.appendChild(listContainer);
        container.appendChild(listPanel);

        // スクロール位置の復元
        if (lastScrollTop > 0) {
            listContainer.scrollTop = lastScrollTop;
        }

        // --- 右: 詳細 ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel';
        detailPanel.style.background = '#fdf5e6';

        let selectedQuest = null;
        let selectedAssignment = null;
        let isPlanning = false;

        // 準備中を優先チェック
        selectedAssignment = (this.gameLoop.plannedQuests || []).find(a => a.quest.id === this.state.selectedQuestId);
        if (selectedAssignment) {
            isPlanning = true;
        } else {
            // 進行中をチェック
            selectedAssignment = this.gameLoop.ongoingQuests.find(a => a.quest.id === this.state.selectedQuestId);
        }

        if (selectedAssignment) selectedQuest = selectedAssignment.quest;
        else selectedQuest = this.gameLoop.activeQuests.find(q => q.id === this.state.selectedQuestId);

        if (selectedQuest) {
            if (this.state.selectionMode && !selectedAssignment) {
                this._renderManualAssignUI(detailPanel, selectedQuest, guild);
            } else {
                this._renderDetail(detailPanel, selectedQuest, selectedAssignment, isPlanning);
            }
        } else {
            detailPanel.innerHTML = `
                <div style="text-align:center; margin-top:50%; transform:translateY(-50%); color:#8d6e63;">
                    <div style="font-size:3rem; opacity:0.3;">📜</div>
                    <p>依頼を選択してください</p>
                </div>
            `;
        }

        container.appendChild(detailPanel);

        // Restore Manual List Scroll
        if (manualScrollTop > 0) {
            const newList = container.querySelector('#adv-select-list');
            if (newList) {
                newList.scrollTop = manualScrollTop;
            }
        }
    }

    _createQuestItem(quest, assignment, isPlanning = false) {
        const div = document.createElement('div');
        div.className = 'list-item';

        if (this.state.selectedQuestId === quest.id) {
            div.className += ' selected';
        }

        if (assignment) {
            div.className += ' ongoing'; // レイアウト維持のためクラス付与
            // 枠線は削除済み
        } else {
            // ランクに基づく色分け (安全度)
            const r = quest.difficulty.rank;
            if (r === 'E') div.className += ' border-safe';
            else if (r === 'D') div.className += ' border-normal';
            else if (r === 'C') div.className += ' border-hard';
            else if (r === 'B') div.className += ' border-dangerous';
            else div.className += ' border-reckless'; // A, S
        }

        let statusHtml = '';
        if (assignment) {
            if (isPlanning) {
                statusHtml = `<span class="text-safe font-bold">準備中 (担当${assignment.members.length}名)</span>`;
            } else {
                statusHtml = `<span class="text-primary font-bold">遂行中 (残り${assignment.remainingDays}日)</span>`;
            }
        } else {
            const manualBadge = quest.manualOnly ? '<span class="status-badge status-badge-manual">手動</span> ' : '';
            const specialBadge = quest.isSpecial ? '<span class="status-badge status-badge-special">特務</span> ' : '';

            statusHtml = `
                 <div>
                    ${specialBadge}${manualBadge}
                    <span>募集${quest.partySize}人</span>
                    <span>残${Math.max(0, (quest.createdDay + quest.expiresInDays) - this.gameLoop.guild.day)}日</span>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-title">${quest.title}</span>
            </div>
            <div class="list-item-meta">
                ${statusHtml}
                <span class="status-badge status-badge-rank">Rank ${quest.difficulty.rank}</span>
            </div>
        `;

        return div;
    }

    _renderDetail(panel, quest, assignment, isPlanning = false) {
        const isOngoing = !!assignment;

        let html = `<div class="panel-header">${quest.title}</div>`;

        let badgesHtml = '';
        if (quest.isSpecial) badgesHtml += `<span class="status-badge status-badge-special" style="margin-right:4px;">特殊依頼</span>`;
        if (quest.manualOnly) badgesHtml += `<span class="status-badge status-badge-manual">手動必須</span>`;

        if (badgesHtml) {
            html += `<div class="mb-md">${badgesHtml}</div>`;
        }

        html += `<hr style="border:0; border-top:1px dashed #a1887f; margin:1rem 0;">`;

        html += `
            <div class="text-desc">
                ${quest.description || "詳細不明"}
            </div>
            <div class="quest-detail-grid">
                <div>種別: ${quest.type}</div>
                <div>ランク: <b>${quest.difficulty.rank}</b></div>
                <div>期間: ${quest.days}日</div>
                <div>募集: ${quest.partySize}人</div>
                <div>危険度: ${quest.danger}%</div>
                <div>期限: あと${Math.max(0, (quest.createdDay + quest.expiresInDays) - this.gameLoop.guild.day)}日</div>
            </div>
            <br>
            <div class="quest-reward-box">
                <b>報酬:</b> ${quest.rewards.money}G + α / 評判 +${quest.rewards.reputation}<br>
                <span class="text-sm text-accent-red">失敗時: 違約金${quest.penalty.money}G / 評判 -${quest.penalty.reputation}</span>
            </div>
        `;

        if (isOngoing) {
            html += `<div class="sub-header">遂行状況</div>`;
            html += `<div style="margin-top:0.5rem;">担当: ${assignment.members.map(m => m.name).join(', ')}</div>`;

            if (isPlanning) {
                html += `<div style="color:#2e7d32; font-weight:bold; margin-top:0.5rem;">状態: 出発準備中</div>`;
                html += `<button id="btn-cancel" class="btn btn-secondary" style="margin-top:1rem;">計画を取り消す</button>`;
            } else {
                html += `<div>進捗: 残り ${assignment.remainingDays}日</div>`;
                // 無効化ボタンは削除済み
            }
        } else {
            html += `<div class="sub-header">アクション</div>`;
            html += `<button id="btn-manual" class="btn btn-primary">隊員を選抜する</button>`;
        }

        panel.innerHTML = html;

        if (isOngoing) {
            const btn = panel.querySelector('#btn-cancel');
            if (btn && !btn.disabled) { // 準備中の場合のみ有効
                btn.onclick = () => {
                    const res = this.gameLoop.assignmentService.cancelAssignment(assignment, this.gameLoop.ongoingQuests, this.gameLoop.plannedQuests);
                    if (res.success) {
                        // キャンセル時は activeQuests に戻す必要があるか確認
                        // AssignmentService.cancelAssignment は activeQuests への復帰は行わない仕様のため、ここで手動復帰
                        if (!this.gameLoop.activeQuests.find(q => q.id === quest.id)) {
                            // リストになければ復帰させる
                            this.gameLoop.activeQuests.push(quest);
                        }
                        this.state.selectedQuestId = null; // 選択解除
                        this.render(panel.parentElement, this.gameLoop.guild, {});

                        document.dispatchEvent(new Event('plan-update'));
                    } else {
                        alert(res.message);
                    }
                };
            }
        } else {
            const btn = panel.querySelector('#btn-manual');
            if (btn) btn.onclick = () => {
                this.state.selectionMode = true;
                this.state.selectedAdventurerIds = [];
                this.render(panel.parentElement, this.gameLoop.guild, {});
            };
        }
    }

    _renderManualAssignUI(panel, quest, guild) {
        panel.innerHTML = `<div class="panel-header">編成: ${quest.title}</div>`;

        const reqSize = quest.partySize;
        const currentCount = this.state.selectedAdventurerIds.length;

        panel.innerHTML += `
            <div class="mb-sm">
                必要人数: <b>${currentCount} / ${reqSize}</b>
            </div>
            <div id="adv-select-list" class="adv-select-list">
                <!-- List -->
            </div>
            <div class="mt-md">
                <button id="btn-confirm" class="btn btn-primary" ${currentCount < reqSize ? 'disabled' : ''}>計画に追加</button>
                <button id="btn-back" class="btn btn-secondary">戻る</button>
            </div>
        `;

        const listDiv = panel.querySelector('#adv-select-list');
        const avail = guild.adventurers.filter(a => a.isAvailable());

        // 適性スコア順にソート (降順)
        avail.sort((a, b) => {
            const sA = this.gameLoop.questService.calculateScore(quest, a);
            const sB = this.gameLoop.questService.calculateScore(quest, b);
            return sB - sA;
        });

        if (avail.length === 0) {
            listDiv.innerHTML = '<div class="p-md text-sub">派遣可能な冒険者がいません</div>';
        }

        avail.forEach(adv => {
            const row = document.createElement('div');
            row.className = 'adv-select-row';

            const isSelected = this.state.selectedAdventurerIds.includes(adv.id);
            if (isSelected) {
                row.classList.add('bg-selected-row');
            }

            const score = Math.floor(this.gameLoop.questService.calculateScore(quest, adv));

            row.innerHTML = `
                <span>${adv.name} <span class="text-sm text-sub-color">(${ADVENTURER_JOB_NAMES[adv.type] || adv.type}/${adv.rankLabel})</span></span>
                <span class="font-mono">適性:${score}</span>
            `;

            row.onclick = () => {
                const toggled = !this.state.selectedAdventurerIds.includes(adv.id);
                if (!toggled) {
                    this.state.selectedAdventurerIds = this.state.selectedAdventurerIds.filter(id => id !== adv.id);
                } else {
                    if (this.state.selectedAdventurerIds.length < reqSize) {
                        this.state.selectedAdventurerIds.push(adv.id);
                    }
                }
                this.render(panel.parentElement, guild, {});
            };
            listDiv.appendChild(row);
        });

        const btnConfirm = panel.querySelector('#btn-confirm');
        if (btnConfirm && !btnConfirm.disabled) {
            btnConfirm.onclick = () => {
                // CHANGED: 新しいシグネチャと手動ハンドリングを使用
                const result = this.gameLoop.assignmentService.manualAssign(quest, this.state.selectedAdventurerIds);
                if (result.success) {
                    // 手動: plannedQuests に追加し、activeQuests から削除
                    this.gameLoop.plannedQuests.push(result.assignment);
                    this.gameLoop.activeQuests = this.gameLoop.activeQuests.filter(q => q.id !== quest.id);

                    this.state.selectionMode = false;
                    this.state.selectedQuestId = null;
                    this.render(panel.parentElement, guild, {});

                    // メイン画面のボタン状態などを更新するためにイベント発火
                    document.dispatchEvent(new Event('plan-update'));
                } else {
                    alert(result.message);
                }
            };
        }

        panel.querySelector('#btn-back').onclick = () => {
            this.state.selectionMode = false;
            this.render(panel.parentElement, guild, {});
        };
    }
}
