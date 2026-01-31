// MonsterDataLoader はブラウザ環境用にハードコードされたモンスターデータを返します
import { MONSTER_DATA } from '../data/monsterData.js';

export class MonsterDataLoader {
    constructor() {
        // ハードコードされたモンスターデータをロード
        this.monsters = MONSTER_DATA;
    }

    /**
     * 以前のバージョンではマークダウンを解析していました。現在はハードコードされたデータを返します。
     */
    parse() {
        return this.monsters;
    }

    /** 指定された地域とランクのモンスターを取得 */
    getMonsters(region, rank) {
        if (!this.monsters[region]) return [];
        return this.monsters[region][rank] || [];
    }
}
