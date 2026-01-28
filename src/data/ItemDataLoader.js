import { ITEM_DATA } from './itemData.js';

export class ItemDataLoader {
    constructor() {
        this.items = ITEM_DATA;
    }

    parse(markdownContent) {
        // Deprecated: markdown parsing is removed in favor of hardcoded data
        // Just return the hardcoded data
        return this.items;
    }

    getItems(region, rank) {
        if (!this.items[region]) return [];
        return this.items[region][rank] || [];
    }
}
