
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
    // 冒険者の高ステータスに基づいて生成
    TACTICIAN: { id: 'TACTICIAN', name: '戦術顧問', stat: 'INT', effect: { winRate: 1.05 }, desc: '作戦立案により勝率を底上げする' },
    INSTRUCTOR: { id: 'INSTRUCTOR', name: '技術教官', stat: 'DEX', effect: { exp: 1.1 }, desc: '新人の訓練効率を高める' },
    GUARD_CAPTAIN: { id: 'GUARD_CAPTAIN', name: '警備隊長', stat: 'VIT', effect: { injury: 0.8 }, desc: '冒険者の安全管理を徹底する' },
    SCOUT_MASTER: { id: 'SCOUT_MASTER', name: '探索主任', stat: 'STR', effect: { dropRate: 1.1 }, desc: '素材発見のノウハウを共有する' }, // STR? おそらくAGI/DEXだがシンプルに
    // マッピング案: Warrior->G.Captain, Mage->Tactician など
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
        costMult: 1, // コスト = 基本コスト * レベル
        description: '冒険者に物資を提供する売店。日々の売上でギルド財政を支える。',
        effectDesc: '日次収入: 冒険者数 × Lv × 2G',
        type: 'INCOME'
    },
    TAVERN: {
        id: 'TAVERN',
        name: '酒場',
        maxLevel: 5,
        baseCost: 800,
        costMult: 1,
        description: '冒険者の憩いの場。活気ある酒場は金を生む。',
        effectDesc: '日次収入: 冒険者数 × Lv × 3G',
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
        costMult: 0, // 固定コスト
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
    },
    PUBLIC_RELATIONS: {
        id: 'PUBLIC_RELATIONS',
        name: '広報部',
        maxLevel: 5,
        baseCost: 1000,
        costMult: 1,
        description: 'ギルドの宣伝活動を行い、新たな冒険者を勧誘する。',
        effectDesc: '冒険者加入率向上 (Lvにより変動)',
        type: 'RECRUIT'
    },
    ADMINISTRATION: {
        id: 'ADMINISTRATION',
        name: '管理部',
        maxLevel: 5,
        baseCost: 1000,
        costMult: 1,
        description: '依頼の受付・管理体制を強化し、より多くの依頼を処理する。',
        effectDesc: '1日の依頼発生数増加 (Lvにより変動)',
        type: 'QUEST'
    }
};

export const CAMPAIGNS = {
    PR_CAMPAIGN: {
        id: 'PR_CAMPAIGN',
        name: '新規冒険者募集',
        description: '街中にポスターを掲示し、呼び込みを行います。冒険者の加入希望率が大幅に上昇します。',
        effectDesc: '加入率 x1.5',
        cost: 200,
        duration: 7,
        mod: { recruit: 1.5 }
    },
    SAFETY_CAMPAIGN: {
        id: 'SAFETY_CAMPAIGN',
        name: '安全啓発週間',
        description: '冒険者に安全講習を行い、無理のない冒険を推奨します。負傷率が低下します。',
        effectDesc: '負傷率 x0.7',
        cost: 100,
        duration: 7,
        mod: { injury: 0.7 }
    },
    TRAINING_CAMPAIGN: {
        id: 'TRAINING_CAMPAIGN',
        name: '強化合宿週間',
        description: '特別講師を招き、集中訓練を行います。獲得経験値が増加します。',
        effectDesc: '経験値 x1.5',
        cost: 500,
        duration: 7,
        mod: { exp: 1.5 }
    },
    SUBJUGATION_CAMPAIGN: {
        id: 'SUBJUGATION_CAMPAIGN',
        name: '魔物討伐週間',
        description: '魔物の討伐を推奨し、報奨金を上乗せします。危険度も増しますが、実入りは良くなります。',
        effectDesc: '報酬 x1.2, 危険度 x1.1',
        cost: 300,
        duration: 7,
        mod: { reward: 1.2, danger: 1.1 }
    },
    MARKET_CAMPAIGN: {
        id: 'MARKET_CAMPAIGN',
        name: '市場開放市週間',
        description: 'ギルド主催の市場を開き、交易を活性化させます。アイテムや施設からの収益が増加します。',
        effectDesc: '売却益・施設収益 x1.2',
        cost: 400,
        duration: 7,
        mod: { market: 1.2 }
    }
};

export const EFFECT_LABELS = {
    danger: '危険度',
    reward: '報酬',
    injury: '負傷率',
    recovery: '回復率',
    recruit: '加入率',
    exp: '経験値',
    xp: '経験値',
    market: '市場需要',
    guildShare: 'ギルドシェア',
    prestige: '名声',
    dropRate: 'ドロップ率',
    winRate: '勝率'
};
