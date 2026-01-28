export class PlaceholderScreen {
    constructor(title) {
        this.title = title;
    }

    render(container, guild, state) {
        container.innerHTML = `
            <div class="panel" style="text-align:center; padding:3rem;">
                <h2>${this.title}</h2>
                <p>この機能は現在開発中です。</p>
                <div style="font-size:4rem; margin:1rem; opacity:0.2;">🚧</div>
            </div>
        `;
    }
}
