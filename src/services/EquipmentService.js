// EquipmentService: ブラウザ環境向けの装備強化機能を提供
import { EQUIPMENT_DATA } from '../data/equipmentData.js';

export class EquipmentService {
    constructor() {
        this.equipmentList = EQUIPMENT_DATA;

        // ランク設定 (仕様 3 & 8)
        this.RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
        this.RANK_PRICES = {
            'E': 50,
            'D': 150,
            'C': 400,
            'B': 900,
            'A': 1800,
            'S': 3500
        };

        // 職業別選好 (仕様 2.2)
        this.JOB_PREFERENCES = {
            'WARRIOR': {
                'WEAPON': { 'LONG_SWORD': 30, 'SHORT_SWORD': 10, 'AXE': 25, 'MACE': 20, 'STAFF': 0, 'BOW': 10, 'SPECIAL': 5 },
                'ARMOR': { 'HEAVY': 35, 'LIGHT': 45, 'CLOTHES': 15, 'ROBE': 5 }
            },
            'KNIGHT': {
                'WEAPON': { 'LONG_SWORD': 45, 'SHORT_SWORD': 5, 'AXE': 10, 'MACE': 20, 'STAFF': 0, 'BOW': 15, 'SPECIAL': 5 },
                'ARMOR': { 'HEAVY': 70, 'LIGHT': 25, 'CLOTHES': 5, 'ROBE': 0 }
            },
            'ROGUE': {
                'WEAPON': { 'LONG_SWORD': 5, 'SHORT_SWORD': 45, 'AXE': 5, 'MACE': 0, 'STAFF': 0, 'BOW': 40, 'SPECIAL': 5 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 70, 'CLOTHES': 30, 'ROBE': 0 }
            },
            'MAGE': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 10, 'AXE': 0, 'MACE': 0, 'STAFF': 70, 'BOW': 10, 'SPECIAL': 10 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 10, 'CLOTHES': 10, 'ROBE': 80 }
            },
            'PRIEST': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 10, 'AXE': 0, 'MACE': 45, 'STAFF': 40, 'BOW': 0, 'SPECIAL': 5 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 10, 'CLOTHES': 20, 'ROBE': 70 }
            },
            'MERCHANT': {
                'WEAPON': { 'LONG_SWORD': 10, 'SHORT_SWORD': 35, 'AXE': 5, 'MACE': 0, 'STAFF': 0, 'BOW': 10, 'SPECIAL': 40 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 15, 'CLOTHES': 70, 'ROBE': 15 }
            },
            'BARD': {
                'WEAPON': { 'LONG_SWORD': 5, 'SHORT_SWORD': 40, 'AXE': 0, 'MACE': 0, 'STAFF': 35, 'BOW': 15, 'SPECIAL': 5 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 20, 'CLOTHES': 60, 'ROBE': 20 }
            },
            'SAMURAI': {
                'WEAPON': { 'LONG_SWORD': 100, 'SHORT_SWORD': 0, 'AXE': 0, 'MACE': 0, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 0, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 20, 'LIGHT': 50, 'CLOTHES': 30, 'ROBE': 0 }
            },
            'SPELLBLADE': {
                'WEAPON': { 'LONG_SWORD': 60, 'SHORT_SWORD': 20, 'AXE': 0, 'MACE': 0, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 20, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 40, 'LIGHT': 40, 'CLOTHES': 10, 'ROBE': 10 }
            },
            'DARK_KNIGHT': {
                'WEAPON': { 'LONG_SWORD': 40, 'SHORT_SWORD': 0, 'AXE': 40, 'MACE': 20, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 0, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 80, 'LIGHT': 20, 'CLOTHES': 0, 'ROBE': 0 }
            },
            'FENG_SHUI': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 10, 'AXE': 0, 'MACE': 0, 'STAFF': 40, 'BOW': 0, 'SPECIAL': 50, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 0, 'CLOTHES': 60, 'ROBE': 40 }
            },
            'PALADIN': {
                'WEAPON': { 'LONG_SWORD': 50, 'SHORT_SWORD': 0, 'AXE': 0, 'MACE': 50, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 0, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 90, 'LIGHT': 10, 'CLOTHES': 0, 'ROBE': 0 }
            },
            'HUNTER': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 0, 'AXE': 0, 'MACE': 0, 'STAFF': 0, 'BOW': 100, 'SPECIAL': 0, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 60, 'CLOTHES': 40, 'ROBE': 0 }
            },
            'NINJA': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 60, 'AXE': 0, 'MACE': 0, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 40, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 20, 'CLOTHES': 80, 'ROBE': 0 }
            },
            'MARTIAL_ARTIST': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 0, 'AXE': 0, 'MACE': 0, 'STAFF': 0, 'BOW': 0, 'SPECIAL': 0, 'GAUNTLET': 100 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 30, 'CLOTHES': 70, 'ROBE': 0 }
            },
            'BISHOP': {
                'WEAPON': { 'LONG_SWORD': 0, 'SHORT_SWORD': 0, 'AXE': 0, 'MACE': 50, 'STAFF': 50, 'BOW': 0, 'SPECIAL': 0, 'GAUNTLET': 0 },
                'ARMOR': { 'HEAVY': 0, 'LIGHT': 0, 'CLOTHES': 20, 'ROBE': 80 }
            }
        };

        // 職業が見つからない場合のデフォルト選好
        this.DEFAULT_PREF = {
            'WEAPON': { 'LONG_SWORD': 20, 'SHORT_SWORD': 20, 'AXE': 10, 'MACE': 10, 'STAFF': 10, 'BOW': 10, 'SPECIAL': 20 },
            'ARMOR': { 'LIGHT': 40, 'CLOTHES': 40, 'HEAVY': 10, 'ROBE': 10 }
        };
    }

    /**
     * 
     * 冒険者の職業と現在のステータスに基づいてランダムな装備を選択
     * ロジック:
     * 1. 資金とランク価格を確認
     * 2. ターゲットランクを決定 (現在より厳密に高い)
     * 3. 職業の重みに基づいてカテゴリを選択
     * 4. アイテムを選択
     */
    upgradeEquipment(adventurer) {
        // 1. 現在のランクを特定
        const currentWeapon = adventurer.equipment.find(e => this._isWeapon(e.type));
        const currentArmor = adventurer.equipment.find(e => this._isArmor(e.type));

        const currentWeaponRank = currentWeapon ? currentWeapon.rank : null;
        const currentArmorRank = currentArmor ? currentArmor.rank : null;

        // 2. ターゲットスロットを決定 (低ランクを優先、またはランダム)
        // 欠けている場合は優先 (ランクなし -> E)
        let targetSlot = 'WEAPON';
        if (!currentWeapon && !currentArmor) targetSlot = Math.random() < 0.5 ? 'WEAPON' : 'ARMOR';
        else if (!currentWeapon) targetSlot = 'WEAPON';
        else if (!currentArmor) targetSlot = 'ARMOR';
        else {
            // ランク比較
            const wIdx = this.RANK_ORDER.indexOf(currentWeaponRank);
            const aIdx = this.RANK_ORDER.indexOf(currentArmorRank);
            if (wIdx < aIdx) targetSlot = 'WEAPON';
            else if (aIdx < wIdx) targetSlot = 'ARMOR';
            else targetSlot = Math.random() < 0.5 ? 'WEAPON' : 'ARMOR';
        }

        // 3. ターゲットランクを決定 (次のランク)
        const currentRank = targetSlot === 'WEAPON' ? currentWeaponRank : currentArmorRank;
        let nextRankIndex = 0;
        if (currentRank) {
            nextRankIndex = this.RANK_ORDER.indexOf(currentRank) + 1;
        }

        // 最大ランクチェック
        if (nextRankIndex >= this.RANK_ORDER.length) return { success: false, reason: 'MAX_RANK' };

        const targetRank = this.RANK_ORDER[nextRankIndex];
        const cost = this.RANK_PRICES[targetRank];

        // 4. 資金チェック (仕様 9.2)
        if (adventurer.personalMoney < cost) return { success: false, cost, reason: 'NO_MONEY' };

        // 5. カテゴリ選択 (重み付きランダム)
        const job = adventurer.type;
        const prefs = this.JOB_PREFERENCES[job] || this.DEFAULT_PREF;
        const categoryWeights = prefs[targetSlot]; // e.g. { 'LONG_SWORD': 40, ... }
        const targetType = this._weightedRandom(categoryWeights);

        if (!targetType) return { success: false, reason: 'NO_TYPE_PREF' };

        // 6. データからアイテムを選択 (タイプ & ランク & 地域でフィルタ?)
        // 仕様 5: "D+ランクは地域素材を含む必要がある"
        // 現在のデータはフラットリスト。タイプとランクでフィルタリング。
        // データが許せば地域マッチングが理想的だが、データは固定名。
        // 現時点ではリストから選択。
        const candidates = this.equipmentList.filter(e => e.type === targetType && e.rank === targetRank);
        if (candidates.length === 0) return { success: false, reason: 'NO_ITEM_DATA' };

        const selectedItem = candidates[Math.floor(Math.random() * candidates.length)];

        // 7. トランザクション実行
        adventurer.personalMoney -= cost;
        // レガシーサポート: 抽象レベルの更新 (オプションだが同期に有用)
        adventurer.addEquipment(selectedItem);

        return { success: true, equipment: selectedItem, cost };
    }

    _isWeapon(type) {
        return ['LONG_SWORD', 'SHORT_SWORD', 'AXE', 'MACE', 'STAFF', 'BOW', 'SPECIAL'].includes(type);
    }

    _isArmor(type) {
        return ['HEAVY', 'LIGHT', 'CLOTHES', 'ROBE'].includes(type);
    }

    _weightedRandom(weights) {
        const keys = Object.keys(weights);
        const total = keys.reduce((sum, key) => sum + weights[key], 0);
        let r = Math.random() * total;
        for (const key of keys) {
            r -= weights[key];
            if (r <= 0) return key;
        }
        return keys[keys.length - 1]; // Fallback
    }
}