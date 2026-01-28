
export const POLICIES = {
    BALANCED: {
        id: 'BALANCED',
        name: '均衡維持',
        description: 'リスクとリターンのバランスを重視する標準的な方針。',
        mod: {}
    },
    AGGRESSIVE: {
        id: 'AGGRESSIVE',
        name: '利益追求',
        description: '危険を顧みず、高い報酬を狙う方針。',
        mod: { danger: 1.2, reward: 1.2, injury: 1.1 }
    },
    SAFE: {
        id: 'SAFE',
        name: '安全第一',
        description: '冒険者の安全を最優先する方針。報酬は下がる。',
        mod: { danger: 0.8, reward: 0.8, injury: 0.5 }
    },
    TRAINING: {
        id: 'TRAINING',
        name: '新人育成',
        description: '成長を促すための指導体制を強化する。',
        mod: { exp: 1.2, recruit: 1.2, reward: 0.9 }
    },
    COMMERCIAL: {
        id: 'COMMERCIAL',
        name: '商業振興',
        description: '交易ルートの開拓と経済活動を優先する。',
        mod: { market: 1.2, guildShare: 1.1, prestige: 0.9 }
    }
};

export const ADVISOR_ROLES = {
    // Generated based on Adventurer High Stats
    TACTICIAN: { id: 'TACTICIAN', name: '戦術顧問', stat: 'INT', effect: { winRate: 1.05 }, desc: '作戦立案により勝率を底上げする' },
    INSTRUCTOR: { id: 'INSTRUCTOR', name: '技術教官', stat: 'DEX', effect: { exp: 1.1 }, desc: '新人の訓練効率を高める' },
    GUARD_CAPTAIN: { id: 'GUARD_CAPTAIN', name: '警備隊長', stat: 'VIT', effect: { injury: 0.8 }, desc: '冒険者の安全管理を徹底する' },
    SCOUT_MASTER: { id: 'SCOUT_MASTER', name: '探索主任', stat: 'STR', effect: { dropRate: 1.1 }, desc: '素材発見のノウハウを共有する' }, // STR? maybe AGI/DEX but keeping simple
    // Maybe better mapping: Warrior->G.Captain, Mage->Tactician, etc.
};

export const RANDOM_EVENTS = [
    {
        id: 'MARKET_BOOM',
        name: '市場好況',
        description: '交易品の需要が高まり、クエスト報酬が増加している。',
        duration: 7,
        mod: { reward: 1.3 }
    },
    {
        id: 'MONSTER_SURGE',
        name: '魔物活性化',
        description: '魔物の動きが活発になり、危険度が増している。',
        duration: 5,
        mod: { danger: 1.3, xp: 1.2 }
    },
    {
        id: 'PEACEFUL_WEEK',
        name: '平穏な日々',
        description: '大きな事件もなく、平和な時間が流れている。',
        duration: 7,
        mod: { danger: 0.7, recruit: 1.2 }
    },
    {
        id: 'INFLUENZA',
        name: '流行り病',
        description: '体調を崩す者が増えている。無理は禁物だ。',
        duration: 10,
        mod: { injury: 1.5, recovery: 0.5 }
    }
];

export const FACILITIES = {
    SHOP: {
        id: 'SHOP',
        name: '売店',
        maxLevel: 5,
        baseCost: 500,
        costMult: 1, // Cost = baseCost * Level
        description: '冒険者に物資を提供する売店。日々の売上でギルド財政を支える。',
        effectDesc: '日次収入: 冒険者数 × Lv × 10G',
        type: 'INCOME'
    },
    TAVERN: {
        id: 'TAVERN',
        name: '酒場',
        maxLevel: 5,
        baseCost: 800,
        costMult: 1,
        description: '冒険者の憩いの場。活気ある酒場は金を生む。',
        effectDesc: '日次収入: 冒険者数 × Lv × 15G',
        type: 'INCOME'
    },
    TRAINING: {
        id: 'TRAINING',
        name: '訓練場',
        maxLevel: 3,
        baseCost: 1000,
        costMult: 1,
        description: '新人のための鍛錬施設。基礎能力の底上げを行う。',
        effectDesc: 'ランクC以下: 経験値獲得・ステータス成長 +10% × Lv',
        type: 'GROWTH'
    },
    INFIRMARY: {
        id: 'INFIRMARY',
        name: '治療所',
        maxLevel: 3,
        baseCost: 1500,
        costMult: 1,
        description: '傷ついた冒険者を癒す施設。早期復帰を可能にし、命を救う。',
        effectDesc: '負傷回復速度 +1/日 × Lv、死亡率低下 -5% × Lv',
        type: 'RECOVERY'
    },
    WAREHOUSE: {
        id: 'WAREHOUSE',
        name: '巨大倉庫',
        maxLevel: 1,
        baseCost: 3000,
        costMult: 0, // Fixed cost
        description: '大量の物資を保管・管理し、市場への供給を最適化する。',
        effectDesc: 'アイテム売却益 +10%',
        type: 'ECONOMY'
    },
    LIBRARY: {
        id: 'LIBRARY',
        name: '資料室',
        maxLevel: 3,
        baseCost: 2000,
        costMult: 1,
        description: '過去の文献や地図を保管する。失われた知識への手掛かりとなる。',
        effectDesc: '古代・特殊系依頼の出現率アップ +10% × Lv',
        type: 'EXPLORATION'
    }
};
