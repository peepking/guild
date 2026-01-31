export const QUEST_SPECS = {
    // 1. Adventure/Exploration
    HUNT: {
        label: 'モンスター討伐',
        category: 'ADVENTURE',
        rates: { battle: { min: 1.0, max: 2.0 }, gather: 0.5 },
        bossDays: ['LAST'],
        weights: { STR: 1.0, VIT: 1.0, DEX: 0.5, INT: 0.2 }, // デフォルトの狩猟ウェイト
        ranks: ['E', 'D', 'C', 'B', 'A', 'S']
    },
    CULLING: {
        label: '危険生物の間引き',
        category: 'ADVENTURE',
        rates: { battle: { min: 2.0, max: 3.0 }, gather: 0.2 },
        bossDays: ['LAST'],
        weights: { STR: 2.0, VIT: 1.5, DEX: 2.0, MAG: 0.5, INT: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C']
    },
    DUNGEON: {
        label: 'ダンジョン探索',
        category: 'ADVENTURE',
        rates: { battle: 1.5, gather: 1.5 },
        bossDays: ['LAST'], // 最終日ボス出現フラグ
        weights: { DEX: 2.5, INT: 2.0, VIT: 1.5, MAG: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['D', 'C', 'B', 'A', 'S']
    },
    RUINS: {
        label: '遺跡調査',
        category: 'ADVENTURE',
        rates: { battle: 0.5, gather: 1.0 },
        // 進捗に基づいたボス(守護者)遭遇チャンス。シミュレーションでは日毎のランダム確率として処理？
        // 守護者バトルイベントの実装。レアバトルイベントとする。
        bossModifier: 0.1, // ボス遭遇率 10%/日
        weights: { INT: 3.0, MAG: 2.0, DEX: 1.5, CHA: 1.0, VIT: 0.5, STR: 0.5 },
        ranks: ['C', 'B', 'A', 'S']
    },
    MATERIAL: {
        label: '素材回収',
        category: 'ADVENTURE',
        rates: { battle: 0.3, gather: 3.0 },
        bossDays: [],
        weights: { DEX: 2.0, VIT: 2.0, STR: 1.5, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C', 'B']
    },

    // 2. Logistics/Economic
    ESCORT: {
        label: '馬車隊護送',
        category: 'LOGISTICS',
        rates: { battle: { min: 0.5, max: 1.0 }, gather: 0 },
        bossDays: ['LAST'],
        weights: { VIT: 2.5, STR: 2.0, CHA: 1.5, DEX: 1.0, INT: 0.5, MAG: 0.5 },
        ranks: ['E', 'D', 'C', 'B']
    },
    TRANSPORT: {
        label: '物資輸送',
        category: 'LOGISTICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { VIT: 3.0, STR: 2.0, DEX: 1.0, INT: 1.0, CHA: 0.5, MAG: 0.5 },
        ranks: ['E', 'D', 'C']
    },
    RESUPPLY: {
        label: '緊急補給',
        category: 'LOGISTICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { DEX: 3.0, VIT: 2.0, STR: 1.5, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['D', 'C', 'B']
    },

    // 3. Citizen/Livelihood
    LOST_CHILD: {
        label: '迷子探し',
        category: 'CITIZEN',
        rates: { battle: 0, gather: 0 },
        bossDays: [],
        weights: { INT: 2.0, CHA: 2.0, DEX: 1.5, VIT: 1.0, STR: 0.5, MAG: 0.5 },
        ranks: ['E', 'D']
    },
    WELL: {
        label: '井戸の怪異調査',
        category: 'CITIZEN',
        rates: { battle: 1.0, gather: 0.1 },
        bossModifier: 0.5, // 中ボス遭遇率 50%
        weights: { INT: 2.0, MAG: 1.5, STR: 1.5, VIT: 1.0, DEX: 1.0, CHA: 0.5 },
        ranks: ['E', 'D']
    },
    EXTERMINATION: {
        label: '家屋の魔物駆除',
        category: 'CITIZEN',
        rates: { battle: { min: 1.0, max: 2.0 }, gather: 0 },
        bossModifier: 0.05, // 希にクイーン出現
        weights: { DEX: 2.5, STR: 1.5, VIT: 1.0, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['E', 'D']
    },
    NIGHT_WATCH: {
        label: '夜警代行',
        category: 'CITIZEN',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { VIT: 2.5, INT: 2.0, STR: 1.5, DEX: 1.0, CHA: 0.5, MAG: 0.5 },
        ranks: ['E', 'D']
    },

    // 4. National/Political
    VIP_GUARD: {
        label: '要人警護',
        category: 'POLITICS',
        rates: { battle: 0.5, gather: 0 },
        bossDays: ['LAST'],
        weights: { CHA: 2.5, VIT: 2.0, STR: 1.5, INT: 1.5, DEX: 1.0, MAG: 0.5 },
        ranks: ['C', 'B', 'A', 'S']
    },
    BORDER_RECON: {
        label: '国境偵察',
        category: 'POLITICS',
        rates: { battle: 0.2, gather: 0.2 },
        bossDays: [],
        weights: { DEX: 3.0, INT: 2.0, VIT: 1.5, STR: 1.0, MAG: 1.0, CHA: 0.5 },
        ranks: ['B', 'A', 'S']
    },
    REBELLION: {
        label: '反乱鎮圧補助',
        category: 'POLITICS',
        rates: { battle: { min: 2.0, max: 5.0 }, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.5, INT: 2.0, VIT: 2.0, DEX: 1.0, MAG: 1.0, CHA: 1.0 },
        ranks: ['A', 'S']
    },
    INTEL: {
        label: '機密情報収集',
        category: 'POLITICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { CHA: 2.5, DEX: 2.5, INT: 2.0, MAG: 1.0, STR: 0.5, VIT: 0.5 },
        ranks: ['B', 'A']
    },

    // 5. Academic
    ECOLOGY: {
        label: '魔物生態調査',
        category: 'ACADEMIC',
        rates: { battle: 0.2, gather: 0.5 },
        bossDays: [],
        weights: { INT: 2.5, DEX: 2.0, VIT: 1.5, MAG: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['C', 'B', 'A']
    },
    DOCUMENTS: {
        label: '古文書回収',
        category: 'ACADEMIC',
        rates: { battle: 0.2, gather: 0.1 },
        bossDays: [],
        weights: { INT: 3.0, MAG: 2.0, CHA: 1.5, STR: 0.5, VIT: 0.5, DEX: 0.5 },
        ranks: ['D', 'C', 'B']
    },
    RELIC_ANALYSIS: {
        label: '遺物分析用採取',
        category: 'ACADEMIC',
        rates: { battle: 0.5, gather: 2.0 },
        bossDays: [],
        weights: { MAG: 3.0, INT: 2.0, DEX: 1.5, VIT: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['B', 'A']
    },
    EXPERIMENT: {
        label: '実験補助',
        category: 'ACADEMIC',
        rates: { battle: 0, gather: 0 },
        bossDays: [],
        weights: { VIT: 3.0, MAG: 2.0, INT: 1.5, STR: 1.0, DEX: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C', 'B', 'A']
    },

    // 6. Disaster
    RESCUE: {
        label: '崩落救助',
        category: 'DISASTER',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { STR: 3.0, DEX: 2.0, VIT: 2.0, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['C', 'B', 'A']
    },
    FLOOD: {
        label: '洪水対策',
        category: 'DISASTER',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { INT: 2.5, STR: 2.5, VIT: 2.0, DEX: 1.0, MAG: 1.0, CHA: 0.5 },
        ranks: ['C', 'B']
    },
    FIRE: {
        label: '火災鎮圧',
        category: 'DISASTER',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { MAG: 3.0, DEX: 2.0, VIT: 2.0, STR: 1.0, INT: 1.0, CHA: 0.5 },
        ranks: ['C', 'B', 'A']
    },
    BARRIER: {
        label: '結界破損修復',
        category: 'DISASTER',
        rates: { battle: 1.0, gather: 0 },
        bossDays: [],
        weights: { MAG: 4.0, INT: 2.5, CHA: 1.0, VIT: 1.0, STR: 0.5, DEX: 0.5 },
        ranks: ['A', 'S']
    },

    // 7. Trouble
    MERCHANT_DISPUTE: {
        label: '商人トラブル仲裁',
        category: 'TROUBLE',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { CHA: 3.0, INT: 2.5, DEX: 1.0, MAG: 0.5, STR: 0.5, VIT: 0.5 },
        ranks: ['D', 'C', 'B']
    },
    ADVENTURER_DISPUTE: {
        label: '冒険者同士の仲裁',
        category: 'TROUBLE',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { STR: 2.0, CHA: 2.0, VIT: 2.0, INT: 1.0, DEX: 0.5, MAG: 0.5 },
        ranks: ['C', 'B']
    },
    DEBT: {
        label: '借金取り立て補助',
        category: 'TROUBLE',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { STR: 2.0, DEX: 2.0, CHA: 1.5, INT: 1.5, VIT: 1.0, MAG: 0.5 },
        ranks: ['D', 'C']
    },
    FRAUD: {
        label: '詐欺調査',
        category: 'TROUBLE',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { INT: 3.0, CHA: 2.0, DEX: 2.0, MAG: 0.5, STR: 0.5, VIT: 0.5 },
        ranks: ['C', 'B']
    },

    // 8. Special
    OTHERWORLD: {
        label: '異界出現',
        category: 'SPECIAL',
        rates: { battle: { min: 3.0, max: 10.0 }, gather: 3.0 },
        bossDays: [], // ゲートキーパーは専用ロジックで処理
        bossModifier: 1.0, // 常時ボス判定
        weights: { MAG: 2.0, STR: 2.0, VIT: 2.0, DEX: 2.0, INT: 2.0, CHA: 1.0 },
        ranks: ['A', 'S']
    },
    ANCIENT_BEAST: {
        label: '古代生物の目覚め',
        category: 'SPECIAL',
        rates: { battle: 1.0, gather: 0.1 },
        bossDays: ['LAST'], // レイドボス想定
        weights: { STR: 3.0, VIT: 3.0, MAG: 2.0, DEX: 1.0, INT: 1.0, CHA: 0.5 },
        ranks: ['S']
    },
    MISSING_ROYAL: {
        label: '王族失踪',
        category: 'SPECIAL',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { INT: 3.0, DEX: 3.0, CHA: 2.0, MAG: 1.0, STR: 1.0, VIT: 1.0 },
        ranks: ['S']
    },
    ORACLE: {
        label: '神託調査',
        category: 'SPECIAL',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { MAG: 3.0, INT: 3.0, CHA: 2.0, VIT: 1.0, STR: 0.5, DEX: 0.5 },
        ranks: ['A', 'S']
    }
};

export const REGIONS = ['EAST', 'NORTH', 'SOUTH', 'WEST', 'CENTRAL'];
