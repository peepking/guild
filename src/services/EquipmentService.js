// EquipmentService: ブラウザ環境向けの装備強化機能を提供
import { EQUIPMENT_DATA } from '../data/equipmentData.js';
import { EQUIPMENT_CONFIG } from '../data/constants.js';
import { JOB_PREFERENCES } from '../data/EquipmentPreferences.js';

/**
 * 装備の購入、アップグレードを管理するサービス
 */
export class EquipmentService {
    /**
     * コンストラクタ
     */
    constructor() {
        this.equipmentList = EQUIPMENT_DATA;
        this.RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S'];
    }

    /**
     * 冒険者の職業と現在のステータスに基づいてランダムな装備を選択
     * ロジック:
     * 1. 資金とランク価格を確認
     * 2. ターゲットランクを決定 (現在より厳密に高い)
     * 3. 職業の重みに基づいてカテゴリを選択
     * 4. アイテムを選択
     * @param {Adventurer} adventurer - 対象冒険者
     * @returns {object} 結果オブジェクト { success, equipment, cost, reason }
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
        const cost = EQUIPMENT_CONFIG.RANK_PRICES[targetRank];

        // 4. 資金チェック (仕様 9.2)
        if (adventurer.personalMoney < cost) return { success: false, cost, reason: 'NO_MONEY' };

        // 5. カテゴリ選択 (重み付きランダム)
        const job = adventurer.type;
        const prefs = JOB_PREFERENCES[job] || EQUIPMENT_CONFIG.DEFAULT_PREF;
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

    /**
     * 指定されたタイプが武器かどうかを判定します。
     * @param {string} type - アイテムタイプ
     * @returns {boolean} 武器の場合true
     * @private
     */
    _isWeapon(type) {
        return ['LONG_SWORD', 'SHORT_SWORD', 'AXE', 'MACE', 'STAFF', 'BOW', 'SPECIAL', 'GAUNTLET'].includes(type);
    }

    /**
     * 指定されたタイプが防具かどうかを判定します。
     * @param {string} type - アイテムタイプ
     * @returns {boolean} 防具の場合true
     * @private
     */
    _isArmor(type) {
        return ['HEAVY', 'LIGHT', 'CLOTHES', 'ROBE'].includes(type);
    }

    /**
     * 重み付きランダム選択を行います。
     * @param {object} weights - キーと重みのペア
     * @returns {string} 選択されたキー
     * @private
     */
    _weightedRandom(weights) {
        const keys = Object.keys(weights);
        const total = keys.reduce((sum, key) => sum + weights[key], 0);
        let r = Math.random() * total;
        for (const key of keys) {
            r -= weights[key];
            if (r <= 0) return key;
        }
        return keys[keys.length - 1]; // フォールバック
    }
}
