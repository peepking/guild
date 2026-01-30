export const CONSTANTS = {
    INITIAL_MONEY: 1000,
    INITIAL_REPUTATION: 0,
    QUEST_COUNT_RANGE: [2, 5], // Min, Max quests per day
    REWARD_VARIANCE: 0.2, // +/- 20%
    BASE_QUEST_REWARD: 100,
    BASE_QUEST_REP: 5
};



export const ADVENTURER_TYPES = {
    WARRIOR: 'WARRIOR',
    KNIGHT: 'KNIGHT',    // Added
    MAGE: 'MAGE',
    ROGUE: 'ROGUE',      // Scout -> Rogue
    PRIEST: 'PRIEST',
    MERCHANT: 'MERCHANT', // Added
    BARD: 'BARD'         // Added
};

export const ORIGINS = {
    CENTRAL: { id: 'central', name: '中央街', statMod: {}, trust: 20 },
    NORTH: { id: 'north', name: '北街', statMod: { STR: 5, VIT: 5 }, trust: 10 },
    SOUTH: { id: 'south', name: '南街', statMod: { CHA: 5, INT: 5 }, trust: 10 },
    EAST: { id: 'east', name: '東街', statMod: { MAG: 5 }, trust: 10 },
    WEST: { id: 'west', name: '西街', statMod: { DEX: 5 }, trust: 10 },
    FOREIGN: { id: 'foreign', name: '遠方', statMod: {}, trust: -10 } // Random stat mod in logic
};

export const JOIN_TYPES = {
    LOCAL: 'local',
    WANDERER: 'wanderer',
    CONTRACT: 'contract'
};

export const LEAVE_TYPES = {
    RETIRE: 'retire',
    LEAVE: 'leave',
    EXPIRE: 'expire',
    DISAPPEAR: 'disappear'
};

export const QUEST_TYPES = {
    HUNT: 'HUNT',       // 戦士が得意
    MAGIC: 'MAGIC',     // 魔法使いが得意
    EXPLORE: 'EXPLORE', // 斥候が得意
    GUARD: 'GUARD'      // 僧侶/戦士が得意
};

export const TYPE_ADVANTAGES = {
    [ADVENTURER_TYPES.WARRIOR]: [QUEST_TYPES.HUNT, QUEST_TYPES.GUARD],
    [ADVENTURER_TYPES.KNIGHT]: [QUEST_TYPES.HUNT, QUEST_TYPES.GUARD],
    [ADVENTURER_TYPES.MAGE]: [QUEST_TYPES.MAGIC],
    [ADVENTURER_TYPES.ROGUE]: [QUEST_TYPES.EXPLORE],
    [ADVENTURER_TYPES.PRIEST]: [QUEST_TYPES.GUARD, QUEST_TYPES.MAGIC],
    [ADVENTURER_TYPES.MERCHANT]: [], // 未来の交易系
    [ADVENTURER_TYPES.BARD]: []      // 未来の交渉系
};

export const STATUS_NAMES = {
    STR: '筋力',
    VIT: '体力',
    MAG: '魔力',
    DEX: '器用',
    INT: '知力',
    CHA: '魅力'
};

export const RANK_THRESHOLDS = [
    { threshold: 100, label: 'S' },
    { threshold: 80, label: 'A' },
    { threshold: 60, label: 'B' },
    { threshold: 40, label: 'C' },
    { threshold: 20, label: 'D' },
    { threshold: 0, label: 'E' }
];

export const GUILD_RANK_THRESHOLDS = [
    { threshold: 12000, label: 'S', name: '伝説のギルド' },
    { threshold: 4500, label: 'A', name: '英雄級ギルド' },
    { threshold: 1500, label: 'B', name: '上級ギルド' },
    { threshold: 500, label: 'C', name: '有力ギルド' },
    { threshold: 100, label: 'D', name: '地方ギルド' },
    { threshold: 0, label: 'E', name: '駆け出しギルド' }
];

export const BASE_STATS = {
    [ADVENTURER_TYPES.WARRIOR]: { STR: 60, VIT: 55, MAG: 20, DEX: 30, INT: 25, CHA: 25 },
    [ADVENTURER_TYPES.KNIGHT]: { STR: 50, VIT: 50, MAG: 25, DEX: 30, INT: 35, CHA: 40 },
    [ADVENTURER_TYPES.MAGE]: { STR: 20, VIT: 25, MAG: 65, DEX: 25, INT: 45, CHA: 25 },
    [ADVENTURER_TYPES.ROGUE]: { STR: 25, VIT: 30, MAG: 25, DEX: 60, INT: 40, CHA: 25 },
    [ADVENTURER_TYPES.PRIEST]: { STR: 25, VIT: 45, MAG: 50, DEX: 25, INT: 40, CHA: 45 },
    [ADVENTURER_TYPES.MERCHANT]: { STR: 20, VIT: 25, MAG: 25, DEX: 35, INT: 55, CHA: 60 },
    [ADVENTURER_TYPES.BARD]: { STR: 20, VIT: 25, MAG: 35, DEX: 25, INT: 40, CHA: 70 }
};

export const TRAITS = {
    // 危険志向系
    coward: { name: "臆病", autoPick: { danger: -0.25 }, hooks: { battleRate: 0.8 } },
    reckless: { name: "無鉄砲", autoPick: { danger: 0.25 }, hooks: { battleRate: 1.2 } },
    cautious: { name: "慎重派", autoPick: { danger: -0.15 }, hooks: { penalty: 0.8 } },
    bold: { name: "豪胆", autoPick: { danger: 0.15 }, hooks: { prestige: 1.1 } },

    // 金銭・社会系
    greedy: { name: "強欲", autoPick: { reward: 0.25 }, hooks: { guildShare: 0.9 } }, // ギルド取り分減
    frugal: { name: "清貧", autoPick: { reward: -0.20 }, hooks: { guildShare: 1.1 } }, // ギルド取り分増
    negotiator: { name: "交渉上手", autoPick: { reward: 0.05 }, hooks: { penalty: 0.8, reward: 1.05 } },
    spender: { name: "浪費家", autoPick: { reward: 0.10 }, hooks: { equipmentRate: 1.5 } }, // LifeEvent
    loyal: { name: "忠義者", autoPick: { prestige: 0.1 }, hooks: { leaveRate: 0.2, trustLoss: 0.5 } },
    troublemaker: { name: "問題児", autoPick: { prestige: -0.1 }, hooks: { troubleRate: 1.5 } }, // LifeEvent

    // 能力・生活系
    drunkard: { name: "酒癖悪し", autoPick: {}, hooks: { accident: 1.2 } }, // LifeEvent
    frail: { name: "虚弱", autoPick: {}, hooks: { injury: 1.2, recovery: 1.2 } },
    ironbody: { name: "鉄人", autoPick: {}, hooks: { injury: 0.8 } },
    veteran: { name: "古参兵", autoPick: {}, hooks: { battleRate: 0.9, winRate: 1.05 } },
    manablessed: { name: "魔導親和", autoPick: {}, hooks: { magicWinRate: 1.1 } },
    tracker: { name: "追跡者", autoPick: {}, hooks: { gatherRate: 1.2 } },
    clumsy: { name: "不器用", autoPick: {}, hooks: { gatherRate: 0.8 } },

    // Personality & Flavor (Added)
    brave: { name: "勇敢", autoPick: { danger: 0.2 }, hooks: { battleRate: 1.1 }, effects: "戦闘に積極的になる" },
    lucky: { name: "強運", autoPick: {}, hooks: { dropRate: 1.2 }, effects: "良いアイテムを見つけやすくなる" },
    unlucky: { name: "不運", autoPick: {}, hooks: { accident: 1.2 }, effects: "トラブルに巻き込まれやすくなる" },
    glutton: { name: "健啖家", autoPick: { reward: 0.1 }, hooks: { recovery: 1.1 }, effects: "回復が早いが金もかかる" },
    lewd: { name: "好色", autoPick: {}, hooks: { troubleRate: 1.1 }, effects: "異性トラブルを起こしやすい" },
    gambling: { name: "賭博狂", autoPick: { reward: 0.2 }, hooks: { spending: 1.5 }, effects: "所持金を散財しやすい" },
    night_owl: { name: "夜行性", autoPick: {}, hooks: {}, effects: "夜の活動が得意(未実装)" },
    energetic: { name: "熱血", autoPick: { danger: 0.1 }, hooks: { battleRate: 1.1 }, effects: "疲れを知らずに行動する" },
    gloomy: { name: "根暗", autoPick: {}, hooks: { social: -0.2 }, effects: "人付き合いを避ける" },
    chuuni: { name: "中二病", autoPick: {}, hooks: {}, effects: "独自の解釈で世界を見る" },
    narcissist: { name: "ナルシスト", autoPick: {}, hooks: { prestige: 1.1 }, effects: "自分の手柄を強調する" },
    wild: { name: "野生児", autoPick: {}, hooks: { gatherRate: 1.1 }, effects: "自然の中での活動が得意" },
    calm: { name: "冷静沈着", autoPick: { danger: -0.1 }, hooks: { penalty: 0.9 }, effects: "ピンチでも動じない" },
    battle_junkie: { name: "戦闘狂", autoPick: { danger: 0.3 }, hooks: { battleRate: 1.3 }, effects: "戦いを求め続ける" },
    noble: { name: "元貴族", autoPick: {}, hooks: { guildShare: 1.1 }, effects: "高貴な振る舞い" },
    scholar: { name: "学者肌", autoPick: {}, hooks: { identify: 1.2 }, effects: "知識欲が旺盛" },
    poet: { name: "詩人", autoPick: {}, hooks: {}, effects: "冒険を詩に残したがる" },
    gourmet: { name: "美食家", autoPick: {}, hooks: { spending: 1.2 }, effects: "食事にこだわりがある" },
    clean_freak: { name: "潔癖症", autoPick: {}, hooks: { swamp: -0.2 }, effects: "汚れる場所を嫌う" },
    kind: { name: "お人好し", autoPick: {}, hooks: { reward: -0.1 }, effects: "他人を助けて損をする" }
};

export const ADVENTURER_RANKS = [
    { threshold: 1000, label: 'S' },
    { threshold: 640, label: 'A' },
    { threshold: 380, label: 'B' },
    { threshold: 200, label: 'C' },
    { threshold: 80, label: 'D' },
    { threshold: 0, label: 'E' }
];

export const QUEST_RANK_VALUE = {
    E: 1, D: 2, C: 3, B: 4, A: 5, S: 6
};

export const QUEST_DIFFICULTY = {
    E: { rank: 'E', powerReq: 5, baseReward: 10, baseRep: 1.0 },
    D: { rank: 'D', powerReq: 10, baseReward: 20, baseRep: 1.5 },
    C: { rank: 'C', powerReq: 20, baseReward: 30, baseRep: 2.0 },
    B: { rank: 'B', powerReq: 40, baseReward: 50, baseRep: 3.0 },
    A: { rank: 'A', powerReq: 70, baseReward: 80, baseRep: 4.0 },
    S: { rank: 'S', powerReq: 100, baseReward: 100, baseRep: 5.0 }
};
