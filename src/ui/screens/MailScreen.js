
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

        detailContainer.innerHTML = `
            <div class="detail-content">
                <div class="detail-header">
                    <div class="detail-meta">
                        <span class="detail-type">${this._getTypeLabel(mail.type)}</span>
                    </div>
                    <h3 class="detail-title">${mail.title}</h3>
                </div>
                <div class="detail-body">
                    ${mail.body.replace(/\n/g, '<br>')}
                </div>
                ${this._renderActions(mail)}
            </div>
        `;
    }

    _renderActions(mail) {
        // Future: Event choices logic using mail.meta
        return '';
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
