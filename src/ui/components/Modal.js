export class Modal {
    constructor() {
        this.overlay = null;
        this.resolvePromise = null;
        this.init();
    }

    init() {
        // コンテナが存在しなければ作成
        if (!document.getElementById('modal-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'modal-overlay';
            this.overlay.className = 'modal-overlay hidden';

            // 内部構造
            this.overlay.innerHTML = `
                <div class="modal-window">
                    <div class="modal-header">
                        <div id="modal-title" class="modal-title">Notification</div>
                    </div>
                    <div id="modal-body" class="modal-body">
                        <!-- Content -->
                    </div>
                    <div id="modal-actions" class="modal-actions">
                        <!-- Buttons -->
                    </div>
                </div>
            `;

            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.getElementById('modal-overlay');
        }
    }

    /**
     * モーダルを表示します。
     * @param {string} title - タイトル
     * @param {string} message - メッセージ本文
     * @param {string} type - 'alert' | 'confirm'
     * @returns {Promise<boolean>} confirmの場合はbool, alertの場合はvoid(true)
     */
    show(title, message, type = 'alert') {
        const titleEl = this.overlay.querySelector('#modal-title');
        const bodyEl = this.overlay.querySelector('#modal-body');
        const actionsEl = this.overlay.querySelector('#modal-actions');

        titleEl.textContent = title;
        bodyEl.innerHTML = message.replace(/\n/g, '<br>');
        actionsEl.innerHTML = ''; // ボタンリセット

        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            if (type === 'confirm') {
                // Cancel Button
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'btn btn-secondary';
                cancelBtn.textContent = 'キャンセル';
                cancelBtn.onclick = () => this.close(false);
                actionsEl.appendChild(cancelBtn);

                // OK Button
                const okBtn = document.createElement('button');
                okBtn.className = 'btn btn-primary';
                okBtn.textContent = 'OK';
                okBtn.onclick = () => this.close(true);
                actionsEl.appendChild(okBtn);
            } else {
                // Alert: OK only
                const okBtn = document.createElement('button');
                okBtn.className = 'btn btn-primary';
                okBtn.textContent = 'OK';
                okBtn.onclick = () => this.close(true);
                actionsEl.appendChild(okBtn);
            }

            // 表示
            this.overlay.classList.remove('hidden');
            this.overlay.classList.add('visible');
        });
    }

    close(result) {
        this.overlay.classList.remove('visible');
        this.overlay.classList.add('hidden');

        if (this.resolvePromise) {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }
    }

    async alert(message, title = '通知') {
        return this.show(title, message, 'alert');
    }

    async confirm(message, title = '確認') {
        return this.show(title, message, 'confirm');
    }
}
