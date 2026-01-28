// MonsterDataLoader returns hardcoded monster data for browser environment
import { MONSTER_DATA } from '../data/monsterData.js';

export class MonsterDataLoader {
    constructor() {
        // Load hardcoded monster data
        this.monsters = MONSTER_DATA;
    }

    /**
     * In previous version this parsed markdown. Now it simply returns the hardcoded data.
     */
    parse() {
        return this.monsters;
    }

    /** Retrieve monsters for a specific region and rank */
    getMonsters(region, rank) {
        if (!this.monsters[region]) return [];
        return this.monsters[region][rank] || [];
    }
}
