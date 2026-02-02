import { MESSAGES } from '../data/messages.js';

/**
 * メール（通知）機能を管理するサービス
 */
export class MailService {
    /**
     * コンストラクタ
     */
    constructor() {
        this.mails = [];
        this.toastQueue = [];
        this.mailCounter = 0;

        // 初回チュートリアルメール
        this.send(
            MESSAGES.MAIL.WELCOME.TITLE,
            MESSAGES.MAIL.WELCOME.BODY,
            "SYSTEM",
            { day: 1 }
        );
    }

    /**
     * 新しいメールを送信（トースト通知もトリガー）
     * @param {string} title - メールのタイトル
     * @param {string} body - メールの本文
     * @param {string} [type='NORMAL'] - メールの種類 ('SYSTEM', 'EVENT', 'IMPORTANT', 'NORMAL')
     * @param {object} [meta={}] - イベント用オプションデータ
     * @returns {void}
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
        this.mails.unshift(mail); // 最新を先頭に

        // トーストロジックをトリガー
        this.toastQueue.push({
            title: title,
            type: type,
            id: Date.now()
        });

        // リスナーへの通知（イベント発火）
        document.dispatchEvent(new CustomEvent('mail-received', { detail: { mail } }));
    }

    /**
     * メールを既読にします。
     * @param {string} id - メールのID
     * @returns {void}
     */
    markAsRead(id) {
        const mail = this.mails.find(m => m.id === id);
        if (mail) {
            mail.isRead = true;
        }
    }

    /**
     * すべてのメールを既読にします。
     * @returns {void}
     */
    markAllAsRead() {
        this.mails.forEach(m => m.isRead = true);
    }

    /**
     * メールを削除します。
     * @param {string} id - メールのID
     * @returns {void}
     */
    delete(id) {
        this.mails = this.mails.filter(m => m.id !== id);
    }

    /**
     * 全メールを取得します。
     * @returns {Array<object>} メールリスト
     */
    getMails() {
        return this.mails;
    }

    /**
     * 未読件数を取得します。
     * @returns {number} 未読メール数
     */
    getUnreadCount() {
        return this.mails.filter(m => !m.isRead).length;
    }

    /**
     * トースト通知キューから最新を取得します。
     * @returns {object|undefined} トーストオブジェクト
     */
    getToast() {
        return this.toastQueue.shift();
    }

    /**
     * データをクリアします（デバッグ用）。
     * @returns {void}
     */
    clear() {
        this.mails = [];
        this.toastQueue = [];
    }
}
