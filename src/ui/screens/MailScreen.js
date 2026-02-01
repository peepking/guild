
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

        // スクロール位置をキャプチャ
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
                    <!-- メールリスト -->
                    <div class="mail-list" id="mail-list">
                        ${mails.length === 0 ? '<div class="empty-state">メッセージはありません</div>' : ''}
                        <!-- 項目はここに挿入されます -->
                    </div>

                    <!-- メール詳細 -->
                    <div class="mail-detail" id="mail-detail">
                        <div class="empty-detail">メールを選択してください</div>
                    </div>
                </div>
            </div>
        `;

        this._renderMailList(mails);

        // スクロール位置を復元
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

        // アクションのバインド
        document.getElementById('mark-all-read-btn')?.addEventListener('click', () => {
            this.gameLoop.mailService.markAllAsRead();
            this.render(); // UIを更新するために再描画
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
                this.render(); // 既読状態と選択を更新するために全画面再描画
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

        // アクションボタンのバインド
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

        // サービスからの永続的な参照があることを確認
        const mail = this.gameLoop.mailService.getMails().find(m => m.id === mailArg.id) || mailArg;

        if (mail.acted) {

            return;
        }

        // GameLoop経由でアクションを実行
        const result = this.gameLoop.handleMailAction(action.id, action.data);


        if (result.success) {
            mail.acted = true; // 正しい参照でローカルにactedとしてマーク
            this.gameLoop.uiManager.showToast(result.message || '完了しました', 'success');

            // 詳細ビューを即座に強制再描画
            // 詳細ビューを即座に強制再描画
            this._renderDetail(mail);

            // ビュー状態のリセットを避けるため、this.render()は呼び出さない
            this._updateBadge();
        } else {

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
        // グローバル更新をトリガー
        // 安全であればDOM経由でレイアウトを直接更新
        document.dispatchEvent(new CustomEvent('mail-updated'));
    }
}
