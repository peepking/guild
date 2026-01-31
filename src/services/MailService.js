
export class MailService {
    constructor() {
        this.mails = [];
        this.toastQueue = [];
        this.mailCounter = 0;

        // 初回チュートリアルメール
        this.send(
            "ギルドへようこそ",
            "ギルド運営へようこそ！\nまずは「依頼」メニューからクエストを発注し、冒険者を派遣してみましょう。\n日数が経過すると結果が届きます。",
            "SYSTEM",
            { day: 1 }
        );
    }

    /**
     * 新しいメールを送信（トースト通知もトリガー）
     * @param {string} title 
     * @param {string} body 
     * @param {string} type - 'SYSTEM', 'EVENT', 'IMPORTANT', 'NORMAL'
     * @param {object} meta - イベント用オプションデータ
     */
    send(title, body, type = 'NORMAL', meta = {}) {
        this.mailCounter++;
        const mail = {
            id: `mail_${this.mailCounter}`,
            title,
            body,
            type,
            meta,
            isRead: false,
            date: new Date().toISOString(), // ゲーム内Dayがあればコンテキストから取得推奨
            timestamp: Date.now()
        };
        this.mails.unshift(mail); // Newest first
        // 最新を先頭に

        // Trigger Toast logic
        // トーストロジックをトリガー
        this.toastQueue.push({
            title: title,
            type: type,
            id: Date.now()
        });

        // リスナーへの通知（イベント発火）
        document.dispatchEvent(new CustomEvent('mail-received', { detail: { mail } }));
    }

    markAsRead(id) {
        const mail = this.mails.find(m => m.id === id);
        if (mail) {
            mail.isRead = true;
        }
    }

    markAllAsRead() {
        this.mails.forEach(m => m.isRead = true);
    }

    delete(id) {
        this.mails = this.mails.filter(m => m.id !== id);
    }

    getMails() {
        return this.mails;
    }

    getUnreadCount() {
        return this.mails.filter(m => !m.isRead).length;
    }

    getToast() {
        return this.toastQueue.shift();
    }

    // デバッグ用
    clear() {
        this.mails = [];
        this.toastQueue = [];
    }
}
