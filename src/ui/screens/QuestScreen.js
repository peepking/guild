import { TRAITS } from '../../data/constants.js';

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
        // Capture scroll position before clearing
        let lastScrollTop = 0;
        const existingList = container.querySelector('.scroll-list');
        if (existingList) {
            lastScrollTop = existingList.scrollTop;
        }

        // Capture Manual List Scroll (Right Panel)
        let manualScrollTop = 0;
        const manualList = container.querySelector('#adv-select-list');
        if (manualList) {
            manualScrollTop = manualList.scrollTop;
        }

        container.innerHTML = '';
        container.className = 'screen-container';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = '1.3fr 1fr';
        container.style.gap = '1.5rem';

        // --- Left: Quest Board ---
        const listPanel = document.createElement('section');
        listPanel.className = 'panel';
        listPanel.style.padding = '0.5rem';

        // Tabs
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs';
        tabsContainer.style.marginBottom = '0.5rem';

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

        // List Area
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

        // Render Planned (Preparation)
        if (displayPlanned.length > 0) {
            const h = document.createElement('div');
            h.className = 'list-header';
            h.textContent = '準備中';
            // Removed background color as requested
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

        // Render Ongoing
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

        // Render Active
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

        // Restore scroll position
        if (lastScrollTop > 0) {
            listContainer.scrollTop = lastScrollTop;
        }

        // --- Right: Details ---
        const detailPanel = document.createElement('section');
        detailPanel.className = 'panel detail-panel';
        detailPanel.style.background = '#fdf5e6';

        let selectedQuest = null;
        let selectedAssignment = null;
        let isPlanning = false;

        // Check Planned first
        selectedAssignment = (this.gameLoop.plannedQuests || []).find(a => a.quest.id === this.state.selectedQuestId);
        if (selectedAssignment) {
            isPlanning = true;
        } else {
            // Check Ongoing
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
            div.className += ' ongoing'; // Keep ongoing class for layout
            // Removed planning border as requested
        } else {
            // Apply Color based on Rank (Safety)
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
                statusHtml = `<span style="color:#2e7d32; font-weight:bold;">準備中 (担当${assignment.members.length}名)</span>`;
            } else {
                statusHtml = `<span style="color:#1565c0; font-weight:bold;">遂行中 (残り${assignment.remainingDays}日)</span>`;
            }
        } else {
            const manualBadge = quest.manualOnly ? '<span class="status-badge" style="background:#bf360c; color:#efebe9;">手動</span> ' : '';
            const specialBadge = quest.isSpecial ? '<span class="status-badge" style="background:#263238; color:#efebe9;">特務</span> ' : '';

            statusHtml = `
                 <div>
                    ${specialBadge}${manualBadge}
                    <span>募集${quest.partySize}人</span>
                    <span>残${quest.expiresInDays}日</span>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-title">${quest.title}</span>
            </div>
            <div class="list-item-meta">
                ${statusHtml}
                <span class="status-badge" style="background:#efebe9; border:1px solid #d7ccc8;">Rank ${quest.difficulty.rank}</span>
            </div>
        `;

        return div;
    }

    _renderDetail(panel, quest, assignment, isPlanning = false) {
        const isOngoing = !!assignment;

        let html = `<div class="panel-header">${quest.title}</div>`;

        let badgesHtml = '';
        if (quest.isSpecial) badgesHtml += `<span class="status-badge" style="background:#263238; color:#efebe9; margin-right:4px;">特殊依頼</span>`;
        if (quest.manualOnly) badgesHtml += `<span class="status-badge" style="background:#bf360c; color:#efebe9;">手動必須</span>`;

        if (badgesHtml) {
            html += `<div style="margin-bottom:1rem;">${badgesHtml}</div>`;
        }

        html += `<hr style="border:0; border-top:1px dashed #a1887f; margin:1rem 0;">`;

        html += `
            <div class="text-base text-sub" style="margin-bottom:0.8rem; font-style:italic;">
                ${quest.description || "詳細不明"}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;" class="text-base text-sub">
                <div>種別: ${quest.type}</div>
                <div>ランク: <b>${quest.difficulty.rank}</b></div>
                <div>期間: ${quest.days}日</div>
                <div>募集: ${quest.partySize}人</div>
                <div>危険度: ${quest.danger}%</div>
                <div>期限: あと${quest.expiresInDays || '?'}日</div>
            </div>
            <br>
            <div style="background:#efebe9; padding:0.8rem; border-radius:4px; border:1px solid #d7ccc8;" class="text-base">
                <b>報酬:</b> ${quest.rewards.money}G + α / 評判 +${quest.rewards.reputation}<br>
                <span style="font-size:0.9em; color:#bf360c;">失敗時: 違約金${quest.penalty.money}G / 評判 -${quest.penalty.reputation}</span>
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
                // Removed disabled button
            }
        } else {
            html += `<div class="sub-header">アクション</div>`;
            html += `<button id="btn-manual" class="btn btn-primary">隊員を選抜する</button>`;
        }

        panel.innerHTML = html;

        if (isOngoing) {
            const btn = panel.querySelector('#btn-cancel');
            if (btn && !btn.disabled) { // Only enables for Planning
                btn.onclick = () => {
                    const res = this.gameLoop.assignmentService.cancelAssignment(assignment, this.gameLoop.ongoingQuests, this.gameLoop.plannedQuests);
                    if (res.success) {
                        // Must verify if we need to put it back to activeQuests? 
                        // AssignmentService.cancelAssignment doesn't add it back to activeQuests automatically!
                        // We need to restore it to active list if we want it to reappear.
                        // But assignment object has 'quest'.
                        if (!this.gameLoop.activeQuests.find(q => q.id === quest.id)) {
                            // Restore to active list if not there
                            this.gameLoop.activeQuests.push(quest);
                        }
                        this.state.selectedQuestId = null; // Deselect
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
            <div style="margin-bottom:0.5rem;">
                必要人数: <b>${currentCount} / ${reqSize}</b>
            </div>
            <div id="adv-select-list" style="height:250px; overflow-y:auto; border:1px solid #a1887f; background:#fff; padding:0.5rem;">
                <!-- List -->
            </div>
            <div style="margin-top:1rem;">
                <button id="btn-confirm" class="btn btn-primary" ${currentCount < reqSize ? 'disabled' : ''}>計画に追加</button>
                <button id="btn-back" class="btn btn-secondary">戻る</button>
            </div>
        `;

        const listDiv = panel.querySelector('#adv-select-list');
        const avail = guild.adventurers.filter(a => a.isAvailable());

        // Sort by suitability score (descending)
        avail.sort((a, b) => {
            const sA = this.gameLoop.questService.calculateScore(quest, a);
            const sB = this.gameLoop.questService.calculateScore(quest, b);
            return sB - sA;
        });

        if (avail.length === 0) {
            listDiv.innerHTML = `<div style="padding:1rem;">派遣可能な冒険者がいません</div>`;
        }

        avail.forEach(adv => {
            const row = document.createElement('div');
            // Use local styling for compact list or reuse .list-item? 
            // This is a sub-list. Let's keep it simple mostly but consistent fonts.
            row.style.padding = '8px';
            row.style.borderBottom = '1px dashed #d7ccc8';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.cursor = 'pointer';

            const isSelected = this.state.selectedAdventurerIds.includes(adv.id);
            if (isSelected) {
                row.style.backgroundColor = '#c8e6c9';
                row.style.fontWeight = 'bold';
            }

            const score = Math.floor(this.gameLoop.questService.calculateScore(quest, adv));

            row.innerHTML = `
                <span>${adv.name} <span style="font-size:0.8em; color:#777;">(${adv.type}/${adv.rankLabel})</span></span>
                <span style="font-family:monospace;">適性:${score}</span>
            `;

            row.onclick = () => {
                if (isSelected) {
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
                // CHANGED: Use new signature and manual handling
                const result = this.gameLoop.assignmentService.manualAssign(quest, this.state.selectedAdventurerIds);
                if (result.success) {
                    // Manual: Add to plannedQuests, remove from activeQuests
                    this.gameLoop.plannedQuests.push(result.assignment);
                    this.gameLoop.activeQuests = this.gameLoop.activeQuests.filter(q => q.id !== quest.id);

                    this.state.selectionMode = false;
                    this.state.selectedQuestId = null;
                    this.render(panel.parentElement, guild, {});

                    // Dispatch event to update MainScreen buttons if needed (though nextDay handles it usually)
                    // But here we might flip from 0 to 1 plan, so buttons should sync.
                    // Main.js listens to 'next-day' and 'depart'. Maybe we should trigger a UI update?
                    // Or just let MainScreen update on next render? 
                    // MainScreen toggleButtonState is in main.js, triggered by events.
                    // We should trigger an event or expose update?
                    // Simpler: dispatch a custom event 'plan-updated'
                    document.dispatchEvent(new CustomEvent('plan-updated')); // Requires Main.js loop to listen?
                    // Actually Main.js only has listeners for 'next-day' and 'depart'.
                    // I should add a 'ui-update' listener or just call uiManager.render()?
                    // The button state is outside UIManager.render() loop in Main.js.
                    // I will modify UIManager/Main.js later if needed, but for now let's hope next render covers it?
                    // No, the buttons are in Layout (header), managed by main.js logic.
                    // So I SHOULD trigger something main.js catches.
                    // Let's dispatch 'next-day' fake? No.
                    // Let's dispatch 'plan-update'. I will need to add it to main.js.
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
