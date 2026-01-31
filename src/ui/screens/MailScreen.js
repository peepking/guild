
export class MailScreen {
    constructor(gameLoop) {
        this.gameLoop = gameLoop;
        this.container = null;
        this.selectedMailId = null;
    }

    mount(container) {
        this.container = container;
        this.render();
    }

    unmount() {
        this.container = null;
    }

    render(container) {
        if (container) this.container = container;
        if (!this.container) return;

        // Capture scroll position
        const listEl = document.getElementById('mail-list');
        const lastScroll = listEl ? listEl.scrollTop : 0;

        const mails = this.gameLoop.mailService.getMails();
        const unreadCount = this.gameLoop.mailService.getUnreadCount();

        this.container.innerHTML = `
            <div class="mail-screen">
                <div class="mail-header">
                    <h2>郵便受け</h2>
                    <div class="mail-actions">
                        <button id="mark-all-read-btn" class="btn btn-secondary btn-sm">全て既読にする</button>
                    </div>
                </div>

                <div class="mail-layout">
                    <!-- Mail List -->
                    <div class="mail-list" id="mail-list">
                        ${mails.length === 0 ? '<div class="empty-state">メッセージはありません</div>' : ''}
                        <!-- Items injected here -->
                    </div>

                    <!-- Mail Detail -->
                    <div class="mail-detail" id="mail-detail">
                        <div class="empty-detail">メールを選択してください</div>
                    </div>
                </div>
            </div>
        `;

        this._renderMailList(mails);

        // Restore scroll
        const newListEl = document.getElementById('mail-list');
        if (newListEl) {
            newListEl.scrollTop = lastScroll;
        }

        if (this.selectedMailId) {
            const selectedMail = mails.find(m => m.id === this.selectedMailId);
            if (selectedMail) {
                this._renderDetail(selectedMail);
            }
        }

        // Bind Actions
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
            this.gameLoop.mailService.markAllAsRead();
            this.render(); // Re-render to update UI
            this._updateBadge();
        });
    }

    _renderMailList(mails) {
        const listContainer = document.getElementById('mail-list');
        if (!listContainer || mails.length === 0) return;

        listContainer.innerHTML = '';
        mails.forEach(mail => {
            const isSelected = mail.id === this.selectedMailId;
            const item = document.createElement('div');
            item.className = `mail-item ${mail.isRead ? 'read' : 'unread'} ${mail.type.toLowerCase()} ${isSelected ? 'selected' : ''}`;
            item.innerHTML = `
                <div class="mail-icon">✉</div>
                <div class="mail-info">
                    <div class="mail-title-row">
                        <span class="mail-type-badge">${this._getTypeLabel(mail.type)}</span>
                        <span class="mail-title">${mail.title}</span>
                    </div>
                    <div class="mail-preview">${mail.body.substring(0, 20)}...</div>
                </div>
                ${!mail.isRead ? '<div class="unread-dot">●</div>' : ''}
            `;

            item.addEventListener('click', () => {
                this.selectedMailId = mail.id;
                this.gameLoop.mailService.markAsRead(mail.id);
                this.render(); // Re-render full screen to update read status and selection
                this._updateBadge();
            });
            listContainer.appendChild(item);
        });
    }

    _renderDetail(mail) {
        const detailContainer = document.getElementById('mail-detail');
        if (!detailContainer) return;

        const actions = (mail.meta && mail.meta.actions) || mail.actions;
        let actionsHtml = '';
        if (actions && actions.length > 0 && !mail.acted) {
            actionsHtml = `<div class="mail-actions-body">`;
            actions.forEach((action, index) => {
                actionsHtml += `<button class="btn btn-primary action-btn" data-index="${index}">${action.label}</button>`;
            });
            actionsHtml += `</div>`;
        } else if (mail.acted) {
            actionsHtml = `<div class="mail-actions-body"><div class="action-completed">対応済み</div></div>`;
        }

        detailContainer.innerHTML = `
            <div class="mail-detail-header">
                <div class="mail-header-top" style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 class="mail-detail-title" style="margin:0;">${mail.title}</h3>
                    <button id="delete-mail-btn" class="btn btn-danger btn-sm">削除</button>
                </div>
                <div class="mail-detail-meta" style="margin-top:0.5rem; display:flex; gap:0.5rem;">
                    <span class="mail-type-badge ${mail.type.toLowerCase()}">${this._getTypeLabel(mail.type)}</span>
                    <span class="mail-date">Day ${mail.meta && mail.meta.day ? mail.meta.day : ''}</span>
                </div>
            </div>
            <div class="mail-detail-body">
                ${mail.body.replace(/\n/g, '<br>')}
            </div>
            ${actionsHtml}
        `;

        // Bind Action Buttons
        const actionBtns = detailContainer.querySelectorAll('.action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const action = actions[idx];
                this._handleAction(mail, action);
            });
        });

        document.getElementById('delete-mail-btn')?.addEventListener('click', () => {
            if (confirm("削除しますか？")) {
                this.gameLoop.mailService.delete(mail.id);
                this.selectedMailId = null;
                this.render();
            }
        });
    }

    _handleAction(mailArg, action) {
        console.log("Handle Action Start. Mail ID:", mailArg.id, "Action:", action);
        // Ensure we have the persistent reference from the service
        const mail = this.gameLoop.mailService.getMails().find(m => m.id === mailArg.id) || mailArg;

        if (mail.acted) {
            console.log("Mail is already acted.");
            return;
        }

        // Execute Action via GameLoop
        const result = this.gameLoop.handleMailAction(action.id, action.data);
        console.log("Action Result:", result);

        if (result.success) {
            mail.acted = true; // Mark as acted locally on the correct reference
            this.gameLoop.uiManager.showToast(result.message || '完了しました', 'success');

            // Force re-render of detail view immediately
            console.log("Forcing _renderDetail with mail.acted =", mail.acted);
            this._renderDetail(mail);

            // Do NOT call this.render() to avoid resetting view state
            this._updateBadge();
        } else {
            console.error("Action Failed:", result);
            this.gameLoop.uiManager.showToast(result.message || '失敗しました', 'error');
        }
    }

    _getTypeLabel(type) {
        const map = {
            'SYSTEM': 'システム',
            'EVENT': 'イベント',
            'IMPORTANT': '重要',
            'NORMAL': '一般'
        };
        return map[type] || '一般';
    }

    _updateBadge() {
        // Trigger global update? 
        // Or directly update Layout via DOM if safe?
        document.dispatchEvent(new CustomEvent('mail-updated'));
    }
}
