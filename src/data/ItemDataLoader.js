import { ITEM_DATA } from './itemData.js';

export class ItemDataLoader {
    constructor() {
        this.items = ITEM_DATA;
    }

    parse(markdownContent) {
        // 非推奨: マークダウン解析はハードコードデータ推奨のため削除されました
        // ハードコードされたデータを返します
        return this.items;
    }

    getItems(region, rank) {
        if (!this.items[region]) return [];
        return this.items[region][rank] || [];
    }
}
