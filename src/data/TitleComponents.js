
export const TRAIT_TITLES = {
    // Basic Traits
    'BRAVE': {
        kana: { pre: 'ブレイブ', suf: 'ヒーロー' },
        kanji: { pre: '勇敢なる', suf: '勇者' }
    },
    'TIMID': {
        kana: { pre: 'シャイ', suf: 'チキン' },
        kanji: { pre: '慎重な', suf: '臆病者' }
    },
    'GREED': {
        kana: { pre: 'グリード', suf: 'コレクター' },
        kanji: { pre: '強欲な', suf: '収集家' }
    },
    'LUCKY': {
        kana: { pre: 'ラッキー', suf: 'フォーチュン' },
        kanji: { pre: '幸運の', suf: '福男' } // 性別による分岐は未実装
    },
    'UNLUCKY': {
        kana: { pre: 'ミゼラブル', suf: 'バッドラック' },
        kanji: { pre: '不運な', suf: '凶星' }
    },
    'LEADER': {
        kana: { pre: 'グランド', suf: 'コマンダー' },
        kanji: { pre: '天性の', suf: '指導者' }
    },
    'LONE_WOLF': {
        kana: { pre: 'ロンリー', suf: 'ウルフ' },
        kanji: { pre: '孤高の', suf: '一匹狼' }
    },
    // アップデートで追加された詳細特性
    'MUSCLE_BRAIN': {
        kana: { pre: 'マッスル', suf: 'マニア' },
        kanji: { pre: '脳筋の', suf: '肉体派' }
    },
    'SCHOLAR': {
        kana: { pre: 'アカデミック', suf: 'プロフェッサー' },
        kanji: { pre: '博識の', suf: '賢人' }
    },
    'GOURMET': {
        kana: { pre: 'グラトニー', suf: 'イーター' },
        kanji: { pre: '美食の', suf: '健啖家' }
    },
    'INSOMNIAC': {
        kana: { pre: 'ミッドナイト', suf: 'ウォーカー' },
        kanji: { pre: '眠らぬ', suf: '夜人' }
    },
    'BERSERKER': {
        kana: { pre: 'クレイジー', suf: 'デストロイヤー' },
        kanji: { pre: '狂乱の', suf: '破壊者' }
    }
};

export const FEAT_TITLES = {
    // Sランククエスト (クエストタイプまたは特殊IDをキーとする)
    'HUNT': {
        kana: { word: 'スレイヤー', pos: 'SUFFIX' },
        kanji: { word: '討伐せし者', pos: 'SUFFIX' }
    },
    'DUNGEON': {
        kana: { word: 'シーカー', pos: 'SUFFIX' },
        kanji: { word: '深淵を覗く', pos: 'PREFIX' }
    },
    'RUINS': {
        kana: { word: 'エクスプローラー', pos: 'SUFFIX' },
        kanji: { word: '遺跡の', pos: 'PREFIX' }
    },
    // ボス (可能であれば特定のボスモンスターID、または汎用タイプをキーとする)
    // 注意: BossTypeを渡すロジックとの連携が必要
    'BOSS_DRAGON': {
        kana: { word: 'ドラグーン', pos: 'SUFFIX' },
        kanji: { word: '竜殺しの', pos: 'PREFIX' }
    },
    'BOSS_DEMON': {
        kana: { word: 'エクソシスト', pos: 'SUFFIX' },
        kanji: { word: '魔を払う', pos: 'PREFIX' }
    },
    'BOSS_YGGDRASIL': {
        kana: { word: 'ワールド', pos: 'SUFFIX' },
        kanji: { word: '世界樹を', pos: 'PREFIX' }
    },

    // デフォルトフォールバック
    'DEFAULT': {
        kana: { word: 'マスター', pos: 'SUFFIX' },
        kanji: { word: '達人', pos: 'SUFFIX' }
    }
};
