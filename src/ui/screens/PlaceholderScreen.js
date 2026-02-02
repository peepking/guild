/**
 * プレースホルダー画面クラス
 * 未実装機能などのプレースホルダーを表示します。
 */
export class PlaceholderScreen {
    /**
     * コンストラクタ
     * @param {string} title 
     */
    constructor(title) {
        this.title = title;
    }

    /**
     * 画面を描画します。
     * @param {HTMLElement} container 
     * @param {object} guild 
     * @param {object} state 
     */
    render(container, guild, state) {
        container.innerHTML = `
            <div class="panel h-full flex-center flex-col p-lg">
                <h2>${this.title}</h2>
                <p>この機能は現在開発中です。</p>
                <div class="text-4xl m-md opacity-25">🚧</div>
            </div>
        `;
    }
}
