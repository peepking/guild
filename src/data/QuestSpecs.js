export const QUEST_SPECS = {
    // 1. Adventure/Exploration
    HUNT: {
        label: 'モンスター討伐',
        category: 'ADVENTURE',
        rates: { battle: { min: 1.0, max: 2.0 }, gather: 0.5 },
        bossDays: ['LAST'],
        weights: { STR: 1.0, VIT: 1.0, DEX: 0.5, INT: 0.2 },
        ranks: ['E', 'D', 'C', 'B', 'A', 'S'],
        duration: { min: 2, max: 4 },
        partySize: { min: 2, max: 5 }
    },
    CULLING: {
        label: '危険生物の間引き',
        category: 'ADVENTURE',
        rates: { battle: { min: 2.0, max: 3.0 }, gather: 0.2 },
        bossDays: ['LAST'],
        weights: { STR: 2.0, VIT: 1.5, DEX: 2.0, MAG: 0.5, INT: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C'],
        duration: { min: 1, max: 3 },
        partySize: { min: 1, max: 3 }
    },
    DUNGEON: {
        label: 'ダンジョン探索',
        category: 'ADVENTURE',
        rates: { battle: 1.5, gather: 1.5 },
        bossDays: ['LAST'],
        weights: { DEX: 2.5, INT: 2.0, VIT: 1.5, MAG: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['D', 'C', 'B', 'A', 'S'],
        duration: { min: 3, max: 7 },
        partySize: { min: 3, max: 5 }
    },
    RUINS: {
        label: '遺跡調査',
        category: 'ADVENTURE',
        rates: { battle: 0.5, gather: 1.0 },
        bossModifier: 0.1,
        weights: { INT: 3.0, MAG: 2.0, DEX: 1.5, CHA: 1.0, VIT: 0.5, STR: 0.5 },
        ranks: ['C', 'B', 'A', 'S'],
        duration: { min: 4, max: 7 },
        partySize: { min: 2, max: 4 }
    },
    MATERIAL: {
        label: '素材回収',
        category: 'ADVENTURE',
        rates: { battle: 0.3, gather: 3.0 },
        bossDays: [],
        weights: { DEX: 2.0, VIT: 2.0, STR: 1.5, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C', 'B'],
        duration: { min: 1, max: 5 },
        partySize: { min: 1, max: 3 }
    },

    // 2. Logistics/Economic
    ESCORT: {
        label: '馬車隊護送',
        category: 'LOGISTICS',
        rates: { battle: { min: 0.5, max: 1.0 }, gather: 0 },
        bossDays: ['LAST'],
        weights: { VIT: 2.5, STR: 2.0, CHA: 1.5, DEX: 1.0, INT: 0.5, MAG: 0.5 },
        ranks: ['E', 'D', 'C', 'B'],
        duration: { min: 2, max: 6 },
        partySize: { min: 2, max: 4 }
    },
    TRANSPORT: {
        label: '物資輸送',
        category: 'LOGISTICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { VIT: 3.0, STR: 2.0, DEX: 1.0, INT: 1.0, CHA: 0.5, MAG: 0.5 },
        ranks: ['E', 'D', 'C'],
        duration: { min: 1, max: 5 },
        partySize: { min: 1, max: 2 }
    },
    RESUPPLY: {
        label: '緊急補給',
        category: 'LOGISTICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { DEX: 3.0, VIT: 2.0, STR: 1.5, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['D', 'C', 'B'],
        duration: { min: 1, max: 3 },
        partySize: { min: 1, max: 3 }
    },

    // 3. Citizen/Livelihood
    LOST_CHILD: {
        label: '迷子探し',
        category: 'CITIZEN',
        rates: { battle: 0, gather: 0 },
        bossDays: [],
        weights: { INT: 2.0, CHA: 2.0, DEX: 1.5, VIT: 1.0, STR: 0.5, MAG: 0.5 },
        ranks: ['E', 'D'],
        duration: { min: 1, max: 1 },
        partySize: { min: 1, max: 2 }
    },
    WELL: {
        label: '井戸の怪異調査',
        category: 'CITIZEN',
        rates: { battle: 1.0, gather: 0.1 },
        bossModifier: 0.5,
        weights: { INT: 2.0, MAG: 1.5, STR: 1.5, VIT: 1.0, DEX: 1.0, CHA: 0.5 },
        ranks: ['E', 'D'],
        duration: { min: 1, max: 1 },
        partySize: { min: 1, max: 2 }
    },
    EXTERMINATION: {
        label: '家屋の魔物駆除',
        category: 'CITIZEN',
        rates: { battle: { min: 1.0, max: 2.0 }, gather: 0 },
        bossModifier: 0.05,
        weights: { DEX: 2.5, STR: 1.5, VIT: 1.0, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['E', 'D'],
        duration: { min: 1, max: 1 },
        partySize: { min: 1, max: 2 }
    },
    NIGHT_WATCH: {
        label: '夜警代行',
        category: 'CITIZEN',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { VIT: 2.5, INT: 2.0, STR: 1.5, DEX: 1.0, CHA: 0.5, MAG: 0.5 },
        ranks: ['E', 'D'],
        duration: { min: 1, max: 1 },
        partySize: { min: 2, max: 3 }
    },

    // 4. National/Political
    VIP_GUARD: {
        label: '要人警護',
        category: 'POLITICS',
        rates: { battle: 0.5, gather: 0 },
        bossDays: ['LAST'],
        weights: { CHA: 2.5, VIT: 2.0, STR: 1.5, INT: 1.5, DEX: 1.0, MAG: 0.5 },
        ranks: ['C', 'B', 'A', 'S'],
        duration: { min: 3, max: 7 },
        partySize: { min: 2, max: 5 }
    },
    BORDER_RECON: {
        label: '国境偵察',
        category: 'POLITICS',
        rates: { battle: 0.2, gather: 0.2 },
        bossDays: [],
        weights: { DEX: 3.0, INT: 2.0, VIT: 1.5, STR: 1.0, MAG: 1.0, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 4, max: 7 },
        partySize: { min: 1, max: 3 }
    },
    REBELLION: {
        label: '反乱鎮圧補助',
        category: 'POLITICS',
        rates: { battle: { min: 2.0, max: 5.0 }, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.5, INT: 2.0, VIT: 2.0, DEX: 1.0, MAG: 1.0, CHA: 1.0 },
        ranks: ['A', 'S'],
        duration: { min: 5, max: 7 },
        partySize: { min: 4, max: 5 }
    },
    INTEL: {
        label: '機密情報収集',
        category: 'POLITICS',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { CHA: 2.5, DEX: 2.5, INT: 2.0, MAG: 1.0, STR: 0.5, VIT: 0.5 },
        ranks: ['B', 'A'],
        duration: { min: 3, max: 10 },
        partySize: { min: 1, max: 2 }
    },

    // 5. Academic
    ECOLOGY: {
        label: '魔物生態調査',
        category: 'ACADEMIC',
        rates: { battle: 0.2, gather: 0.5 },
        bossDays: [],
        weights: { INT: 2.5, DEX: 2.0, VIT: 1.5, MAG: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 3, max: 10 },
        partySize: { min: 2, max: 3 }
    },
    DOCUMENTS: {
        label: '古文書回収',
        category: 'ACADEMIC',
        rates: { battle: 0.2, gather: 0.1 },
        bossDays: [],
        weights: { INT: 3.0, MAG: 2.0, CHA: 1.5, STR: 0.5, VIT: 0.5, DEX: 0.5 },
        ranks: ['D', 'C', 'B'],
        duration: { min: 3, max: 7 },
        partySize: { min: 1, max: 3 }
    },
    RELIC_ANALYSIS: {
        label: '遺物分析用採取',
        category: 'ACADEMIC',
        rates: { battle: 0.5, gather: 2.0 },
        bossDays: [],
        weights: { MAG: 3.0, INT: 2.0, DEX: 1.5, VIT: 1.0, STR: 1.0, CHA: 0.5 },
        ranks: ['B', 'A'],
        duration: { min: 3, max: 7 },
        partySize: { min: 2, max: 4 }
    },
    EXPERIMENT: {
        label: '実験補助',
        category: 'ACADEMIC',
        rates: { battle: 0, gather: 0 },
        bossDays: [],
        weights: { VIT: 3.0, MAG: 2.0, INT: 1.5, STR: 1.0, DEX: 0.5, CHA: 0.5 },
        ranks: ['E', 'D', 'C', 'B', 'A'],
        duration: { min: 1, max: 7 },
        partySize: { min: 1, max: 1 }
    },

    // 6. Disaster
    RESCUE: {
        label: '崩落救助',
        category: 'DISASTER',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { STR: 3.0, DEX: 2.0, VIT: 2.0, INT: 1.0, MAG: 0.5, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 2, max: 5 },
        partySize: { min: 3, max: 5 }
    },
    FLOOD: {
        label: '洪水対策',
        category: 'DISASTER',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { INT: 2.5, STR: 2.5, VIT: 2.0, DEX: 1.0, MAG: 1.0, CHA: 0.5 },
        ranks: ['C', 'B'],
        duration: { min: 2, max: 4 },
        partySize: { min: 3, max: 5 }
    },
    FIRE: {
        label: '火災鎮圧',
        category: 'DISASTER',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { MAG: 3.0, DEX: 2.0, VIT: 2.0, STR: 1.0, INT: 1.0, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 1, max: 2 },
        partySize: { min: 2, max: 5 }
    },
    BARRIER: {
        label: '結界破損修復',
        category: 'DISASTER',
        rates: { battle: 1.0, gather: 0 },
        bossDays: [],
        weights: { MAG: 4.0, INT: 2.5, CHA: 1.0, VIT: 1.0, STR: 0.5, DEX: 0.5 },
        ranks: ['A', 'S'],
        duration: { min: 1, max: 3 },
        partySize: { min: 2, max: 4 }
    },

    // 7. Trouble
    MERCHANT_DISPUTE: {
        label: '商人トラブル仲裁',
        category: 'TROUBLE',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { CHA: 3.0, INT: 2.5, DEX: 1.0, MAG: 0.5, STR: 0.5, VIT: 0.5 },
        ranks: ['D', 'C', 'B'],
        duration: { min: 2, max: 5 },
        partySize: { min: 1, max: 2 }
    },
    ADVENTURER_DISPUTE: {
        label: '冒険者同士の仲裁',
        category: 'TROUBLE',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { STR: 2.0, CHA: 2.0, VIT: 2.0, INT: 1.0, DEX: 0.5, MAG: 0.5 },
        ranks: ['C', 'B'],
        duration: { min: 1, max: 3 },
        partySize: { min: 1, max: 3 }
    },
    DEBT: {
        label: '借金取り立て補助',
        category: 'TROUBLE',
        rates: { battle: 0.3, gather: 0 },
        bossDays: [],
        weights: { STR: 2.0, DEX: 2.0, CHA: 1.5, INT: 1.5, VIT: 1.0, MAG: 0.5 },
        ranks: ['D', 'C'],
        duration: { min: 2, max: 5 },
        partySize: { min: 1, max: 2 }
    },
    FRAUD: {
        label: '詐欺調査',
        category: 'TROUBLE',
        rates: { battle: 0.1, gather: 0 },
        bossDays: [],
        weights: { INT: 3.0, CHA: 2.0, DEX: 2.0, MAG: 0.5, STR: 0.5, VIT: 0.5 },
        ranks: ['C', 'B'],
        duration: { min: 3, max: 7 },
        partySize: { min: 1, max: 2 }
    },

    // 8. Special
    OTHERWORLD: {
        label: '異界出現',
        category: 'SPECIAL',
        rates: { battle: { min: 3.0, max: 10.0 }, gather: 3.0 },
        bossDays: [],
        bossModifier: 1.0,
        weights: { MAG: 2.0, STR: 2.0, VIT: 2.0, DEX: 2.0, INT: 2.0, CHA: 1.0 },
        ranks: ['A', 'S'],
        duration: { min: 5, max: 7 },
        partySize: { min: 4, max: 5 }
    },
    ANCIENT_BEAST: {
        label: '古代生物の目覚め',
        category: 'SPECIAL',
        rates: { battle: 1.0, gather: 0.1 },
        bossDays: ['LAST'],
        weights: { STR: 3.0, VIT: 3.0, MAG: 2.0, DEX: 1.0, INT: 1.0, CHA: 0.5 },
        ranks: ['S'],
        duration: { min: 7, max: 7 },
        partySize: { min: 5, max: 5 }
    },
    MISSING_ROYAL: {
        label: '王族失踪',
        category: 'SPECIAL',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { INT: 3.0, DEX: 3.0, CHA: 2.0, MAG: 1.0, STR: 1.0, VIT: 1.0 },
        ranks: ['S'],
        duration: { min: 5, max: 7 },
        partySize: { min: 3, max: 5 }
    },
    ORACLE: {
        label: '神託調査',
        category: 'SPECIAL',
        rates: { battle: 0.5, gather: 0 },
        bossDays: [],
        weights: { MAG: 3.0, INT: 3.0, CHA: 2.0, VIT: 1.0, STR: 0.5, DEX: 0.5 },
        ranks: ['A', 'S'],
        duration: { min: 4, max: 7 },
        partySize: { min: 1, max: 3 }
    },

    // Special: Demon King Army Invasion
    // Single Occurrence (Rank C+)
    CULT_PURGE: {
        label: '邪教徒の隠れ家殲滅',
        category: 'SPECIAL',
        rates: { battle: 2.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { MAG: 2.0, INT: 2.0, VIT: 1.0, STR: 0.5, DEX: 0.5, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 3, max: 3 },
        partySize: { min: 4, max: 4 }
    },
    SMALL_RAID: {
        label: '魔王軍小隊の撃退',
        category: 'SPECIAL',
        rates: { battle: 2.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.0, VIT: 2.0, DEX: 1.0, MAG: 0.5, INT: 0.5, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 2, max: 2 },
        partySize: { min: 5, max: 5 }
    },
    KIDNAP_INVESTIGATION: {
        label: '人攫い事件の調査',
        category: 'SPECIAL',
        rates: { battle: 0.5, gather: 0.5 },
        bossDays: [],
        weights: { DEX: 2.0, CHA: 2.0, INT: 1.5, VIT: 1.0, MAG: 0.5, STR: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 3, max: 3 },
        partySize: { min: 2, max: 2 }
    },
    MARCH_RECON: {
        label: '敵軍行軍の偵察',
        category: 'SPECIAL',
        rates: { battle: 0.2, gather: 0 },
        bossDays: [],
        weights: { DEX: 2.0, INT: 2.0, VIT: 1.0, STR: 0.5, MAG: 0.5, CHA: 0.5 },
        ranks: ['C', 'B', 'A'],
        duration: { min: 2, max: 2 },
        partySize: { min: 2, max: 2 }
    },
    // Phased: Offensive (Rank B+)
    OFFENSE_BREAKTHROUGH: {
        label: '【攻勢】前線突破',
        category: 'SPECIAL',
        rates: { battle: 2.5, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.0, MAG: 2.0, VIT: 1.5, DEX: 1.0, INT: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    OFFENSE_CAMP_RAID: {
        label: '【攻勢】野営地奇襲',
        category: 'SPECIAL',
        rates: { battle: 2.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.0, DEX: 2.0, VIT: 1.5, MAG: 1.0, INT: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    OFFENSE_GENERAL_HUNT: {
        label: '【攻勢】敵将討ち取り',
        category: 'SPECIAL',
        rates: { battle: 3.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.5, VIT: 2.5, DEX: 1.0, MAG: 0.5, INT: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    // Phased: Defensive (Rank B+)
    DEFENSE_FRONTLINE: {
        label: '【防衛】前線死守',
        category: 'SPECIAL',
        rates: { battle: 2.5, gather: 0 },
        bossDays: [], // Wave survival implied
        weights: { VIT: 2.5, MAG: 2.0, STR: 1.5, DEX: 0.5, INT: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    DEFENSE_SUPPLY: {
        label: '【防衛】補給路確保',
        category: 'SPECIAL',
        rates: { battle: 2.0, gather: 0 },
        bossDays: [],
        weights: { STR: 2.0, VIT: 2.0, DEX: 1.5, INT: 0.5, MAG: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    DEFENSE_FORT: {
        label: '【防衛】砦防衛戦',
        category: 'SPECIAL',
        rates: { battle: 3.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { VIT: 2.5, DEX: 2.0, STR: 1.5, MAG: 1.0, INT: 0.5, CHA: 0.5 },
        ranks: ['B', 'A', 'S'],
        duration: { min: 3, max: 3 },
        partySize: { min: 5, max: 5 }
    },
    // Raid (Rank A+)
    RAID_GENERAL_SUBJUGATION: {
        label: '魔王軍幹部討伐作戦',
        category: 'SPECIAL',
        rates: { battle: 5.0, gather: 0 },
        bossDays: ['LAST'],
        weights: { STR: 2.5, MAG: 2.5, VIT: 2.0, DEX: 1.0, INT: 0.5, CHA: 0.5 },
        ranks: ['A', 'S'],
        duration: { min: 1, max: 1 },
        partySize: { min: 20, max: 20 }
    }
};

export const REGIONS = ['EAST', 'NORTH', 'SOUTH', 'WEST', 'CENTRAL'];
