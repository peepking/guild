/*
 * Title Dictionary
 * Derived from doc/title_dictionary.md
 */

// TraitTitleDef: 全スロット必須（null/undefined/空文字禁止）
export const TRAIT_TITLE_DEFS = [
    // 1. 危険志向系
    { id: "Coward", noun: "臆病者", verb: "逃れる", adj: "臆病なる", kata: "コワード" },
    { id: "Reckless", noun: "無鉄砲者", verb: "踏み込む", adj: "無鉄砲なる", kata: "レックレス" },
    { id: "Cautious", noun: "慎重家", verb: "見極める", adj: "慎重なる", kata: "コーション" },
    { id: "Bold", noun: "豪胆者", verb: "押し通す", adj: "豪胆なる", kata: "ボールド" },

    // 2. 金銭・社会系
    { id: "Greedy", noun: "強欲者", verb: "奪う", adj: "強欲なる", kata: "グリード" },
    { id: "Frugal", noun: "清貧者", verb: "倹約する", adj: "清貧なる", kata: "フルーガル" },
    { id: "Negotiator", noun: "交渉人", verb: "取り決める", adj: "交渉巧みなる", kata: "ネゴシエーター" },
    { id: "Spender", noun: "浪費家", verb: "散財する", adj: "浪費家なる", kata: "スペンダー" },
    { id: "Loyal", noun: "忠義者", verb: "尽くす", adj: "忠義なる", kata: "ロイヤル" },
    { id: "Troublemaker", noun: "厄介者", verb: "掻き回す", adj: "厄介なる", kata: "トラブル" },

    // 3. 能力・生活系
    { id: "Drunkard", noun: "酔いどれ", verb: "酔い潰れる", adj: "酔いどれの", kata: "ドランク" },
    { id: "Frail", noun: "虚弱者", verb: "崩れる", adj: "虚弱なる", kata: "フレイル" },
    { id: "Ironbody", noun: "鉄人", verb: "耐える", adj: "鉄のごとき", kata: "アイアン" },
    { id: "Veteran", noun: "古参兵", verb: "凌ぐ", adj: "老練なる", kata: "ベテラン" },
    { id: "Manablessed", noun: "魔導者", verb: "詠唱する", adj: "魔導に親和せし", kata: "マナブレス" },
    { id: "Tracker", noun: "追跡者", verb: "追う", adj: "追跡する", kata: "トラッカー" },
    { id: "Clumsy", noun: "不器用者", verb: "もたつく", adj: "不器用なる", kata: "クラムジー" },

    // 4. 性格・フレーバー
    { id: "Brave", noun: "勇敢者", verb: "挑む", adj: "勇敢なる", kata: "ブレイブ" },
    { id: "Lucky", noun: "幸運児", verb: "引き当てる", adj: "幸運なる", kata: "フォーチュン" },
    { id: "Unlucky", noun: "不運者", verb: "躓く", adj: "不運なる", kata: "アンラック" },

    { id: "Glutton", noun: "健啖家", verb: "食らう", adj: "健啖なる", kata: "グラトニー" },
    { id: "Lewd", noun: "好色者", verb: "口説く", adj: "好色なる", kata: "リビドー" },
    { id: "Gambling", noun: "賭博狂", verb: "賭ける", adj: "賭博に狂う", kata: "ギャンブラー" },
    { id: "Night Owl", noun: "夜鴉", verb: "夜を駆ける", adj: "夜を好む", kata: "ナイトオウル" },
    { id: "Energetic", noun: "熱血漢", verb: "燃え上がる", adj: "熱血なる", kata: "バーニング" },
    { id: "Gloomy", noun: "陰気者", verb: "塞ぎ込む", adj: "陰鬱なる", kata: "グルーム" },
    { id: "Chuuni", noun: "異端児", verb: "見立てる", adj: "異端なる", kata: "エクリプス" },
    { id: "Narcissist", noun: "自惚れ屋", verb: "魅せる", adj: "自惚れたる", kata: "アロガント" },
    { id: "Wild", noun: "野生児", verb: "嗅ぎつける", adj: "野生の", kata: "ワイルド" },
    { id: "Calm", noun: "冷静者", verb: "見据える", adj: "冷静沈着なる", kata: "クール" },
    { id: "Battle Junkie", noun: "戦闘狂", verb: "血を求める", adj: "戦に飢えたる", kata: "バーサーク" },
    { id: "Noble", noun: "元貴族", verb: "品位を保つ", adj: "高雅なる", kata: "ノーブル" },
    { id: "Scholar", noun: "学者肌", verb: "読み解く", adj: "博識なる", kata: "スカラー" },
    { id: "Poet", noun: "詩人", verb: "詠う", adj: "詩的なる", kata: "ポエット" },
    { id: "Gourmet", noun: "美食家", verb: "味わう", adj: "美食なる", kata: "グルメ" },
    { id: "Clean Freak", noun: "潔癖者", verb: "避ける", adj: "潔癖なる", kata: "クリーン" },
    { id: "Kind", noun: "お人好し", verb: "救う", adj: "温厚なる", kata: "カインド" }
];

// AchievementTitleDef: targetKanji/targetKata は全件必須（null禁止）
export const ACHIEVEMENT_TITLE_DEFS = [
    // =========================
    // BOSSES - CENTRAL
    // =========================
    {
        id: "BOSS_CENTRAL_ABSOLUTE_GOD_DEFEATED",
        targetKanji: "絶対神",
        targetKata: "アブソリュート・ゴッド",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}{targetKanji}討滅者", "{traitNoun}、絶対を砕く者"],
        kataTemplates: ["{traitKata}・アブソリュート", "{traitKata}・ゴッドスレイヤー"]
    },
    {
        id: "BOSS_CENTRAL_CHAOS_KING_DEFEATED",
        targetKanji: "混沌の王",
        targetKata: "カオス・キング",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}混沌鎮圧者", "{traitNoun}、王を砕く者"],
        kataTemplates: ["{traitKata}・カオスブレイカー", "{traitKata}・キングバニッシャー"]
    },
    {
        id: "BOSS_CENTRAL_WORLD_WILL_DEFEATED",
        targetKanji: "世界の意志",
        targetKata: "ワールド・ウィル",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}理を穿つ者", "{traitNoun}、世界をねじ伏せる者"],
        kataTemplates: ["{traitKata}・ワールドシフター", "{traitKata}・ウィルクラッシャー"]
    },

    // =========================
    // BOSSES - EAST
    // =========================
    {
        id: "BOSS_EAST_OBERON_DEFEATED",
        targetKanji: "妖精王オベロン",
        targetKata: "オベロン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}妖精王討滅者", "{traitNoun}、王を墜とす者"],
        kataTemplates: ["{traitKata}・フェイキラー", "{traitKata}・キングスレイヤー"]
    },
    {
        id: "BOSS_EAST_WORLD_TREE_DEFEATED",
        targetKanji: "世界樹",
        targetKata: "ワールドツリー",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}世界樹伐採者", "{traitNoun}、樹海を砕く者"],
        kataTemplates: ["{traitKata}・ワールド", "{traitKata}・ツリーバスター"]
    },
    {
        id: "BOSS_EAST_OUROBOROS_DEFEATED",
        targetKanji: "ウロボロス",
        targetKata: "ウロボロス",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}輪廻断絶者", "{traitNoun}、環を断つ者"],
        kataTemplates: ["{traitKata}・エンドレスブレイカー", "{traitKata}・オロボロスキラー"]
    },

    // =========================
    // BOSSES - NORTH
    // =========================
    {
        id: "BOSS_NORTH_HEL_DEFEATED",
        targetKanji: "ヘル",
        targetKata: "ヘル",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}冥府越えの者", "{traitNoun}、死を退ける者"],
        kataTemplates: ["{traitKata}・ヘルゲート", "{traitKata}・アンダーワールド"]
    },
    {
        id: "BOSS_NORTH_SURTR_DEFEATED",
        targetKanji: "スルト",
        targetKata: "スルト",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}炎禍断罪者", "{traitNoun}、業火を斬る者"],
        kataTemplates: ["{traitKata}・フレイムスレイヤー", "{traitKata}・ラグナブレイカー"]
    },
    {
        id: "BOSS_NORTH_FENRIR_DEFEATED",
        targetKanji: "フェンリル",
        targetKata: "フェンリル",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}魔狼封殺者", "{traitNoun}、狼を鎖す者"],
        kataTemplates: ["{traitKata}・ウルフスレイヤー", "{traitKata}・フェンリルキラー"]
    },

    // =========================
    // BOSSES - SOUTH
    // =========================
    {
        id: "BOSS_SOUTH_RA_DEFEATED",
        targetKanji: "太陽神ラー",
        targetKata: "ラー",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}日輪穿ちの者", "{traitNoun}、陽を墜とす者"],
        kataTemplates: ["{traitKata}・サンブレイカー", "{traitKata}・ソーラースレイヤー"]
    },
    {
        id: "BOSS_SOUTH_BAHAMUT_DEFEATED",
        targetKanji: "バハムート",
        targetKata: "バハムート",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}竜王討滅者", "{traitNoun}、竜を屠る者"],
        kataTemplates: ["{traitKata}・ドラゴンスレイヤー", "{traitKata}・バハムートキラー"]
    },
    {
        id: "BOSS_SOUTH_FAFNIR_DEFEATED",
        targetKanji: "ファフニール",
        targetKata: "ファフニール",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}呪竜断罪者", "{traitNoun}、呪いを斬る者"],
        kataTemplates: ["{traitKata}・カースドドラゴン", "{traitKata}・ファフニールキラー"]
    },

    // =========================
    // BOSSES - WEST
    // =========================
    {
        id: "BOSS_WEST_POSEIDON_DEFEATED",
        targetKanji: "ポセイドン",
        targetKata: "ポセイドン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}海嘯制圧者", "{traitNoun}、潮を裂く者"],
        kataTemplates: ["{traitKata}・シーブレイカー", "{traitKata}・タイドスレイヤー"]
    },
    {
        id: "BOSS_WEST_CTHULHU_DEFEATED",
        targetKanji: "クトゥルフ",
        targetKata: "クトゥルフ",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}旧き恐怖祓い", "{traitNoun}、深淵を退ける者"],
        kataTemplates: ["{traitKata}・オールドワン", "{traitKata}・ディープホラー"]
    },
    {
        id: "BOSS_WEST_LEVIATHAN_DEFEATED",
        targetKanji: "リヴァイアサン",
        targetKata: "リヴァイアサン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}深海断絶者", "{traitNoun}、奈落を裂く者"],
        kataTemplates: ["{traitKata}・リヴァイアサンキラー", "{traitKata}・アビスブレイカー"]
    },

    // =========================
    // QUESTS - S CLEARED
    // =========================
    {
        id: "QUEST_S_HUNT_CLEARED",
        targetKanji: "極級討伐",
        targetKata: "ハント",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}討滅者", "{traitNoun}、狩りを極めし者"],
        kataTemplates: ["{traitKata}・ハンター", "{traitKata}・レイドキラー"]
    },
    {
        id: "QUEST_S_DUNGEON_CLEARED",
        targetKanji: "深層迷宮",
        targetKata: "ダンジョン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}迷宮覇者", "{traitNoun}、深層踏破者"],
        kataTemplates: ["{traitKata}・クロウラー", "{traitKata}・ダンジョンロード"]
    },
    {
        id: "QUEST_S_RUINS_CLEARED",
        targetKanji: "古代遺跡",
        targetKata: "ルーインズ",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}遺跡探究者", "{traitNoun}、真理に触れし者"],
        kataTemplates: ["{traitKata}・ルインシーカー", "{traitKata}・アーキオロジスト"]
    },

    {
        id: "QUEST_S_VIP_GUARD_CLEARED",
        targetKanji: "王命護衛",
        targetKata: "VIPガード",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}護衛長", "{traitNoun}、王命を護る者"],
        kataTemplates: ["{traitKata}・ロイヤルガード", "{traitKata}・ボディガード"]
    },
    {
        id: "QUEST_S_BORDER_RECON_CLEARED",
        targetKanji: "国境偵察",
        targetKata: "リコン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}影の偵察者", "{traitNoun}、境を往く者"],
        kataTemplates: ["{traitKata}・シャドウスカウト", "{traitKata}・フロンティアアイ"]
    },
    {
        id: "QUEST_S_REBELLION_CLEARED",
        targetKanji: "反乱鎮圧",
        targetKata: "レベリオン",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}鎮圧者", "{traitNoun}、乱を鎮めし者"],
        kataTemplates: ["{traitKata}・レベリオンブレイカー", "{traitKata}・ピースメーカー"]
    },

    {
        id: "QUEST_S_BARRIER_CLEARED",
        targetKanji: "結界修復",
        targetKata: "バリア",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}結界修復者", "{traitNoun}、魔を封ずる者"],
        kataTemplates: ["{traitKata}・マギスター", "{traitKata}・バリアリペア"]
    },
    {
        id: "QUEST_S_OTHERWORLD_CLEARED",
        targetKanji: "異界封鎖",
        targetKata: "アザー",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}門の破壊者", "{traitNoun}、異界を閉じる者"],
        kataTemplates: ["{traitKata}・ゲートブレイカー", "{traitKata}・アザーワールド"]
    },
    {
        id: "QUEST_S_ORACLE_CLEARED",
        targetKanji: "神託解読",
        targetKata: "オラクル",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}神託解読者", "{traitNoun}、因果を読む者"],
        kataTemplates: ["{traitKata}・オラクル", "{traitKata}・フェイトリーダー"]
    },

    {
        id: "QUEST_S_ANCIENT_BEAST_CLEARED",
        targetKanji: "古代生物封印",
        targetKata: "エンシェント",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}巨獣討伐者", "{traitNoun}、古代を封ずる者"],
        kataTemplates: ["{traitKata}・エンシェントハンター", "{traitKata}・ビーストバインダー"]
    },
    {
        id: "QUEST_S_MISSING_ROYAL_CLEARED",
        targetKanji: "王族救出",
        targetKata: "ロイヤル",
        kanjiTemplates: ["{targetKanji}を{traitVerb}もの", "{traitAdj}救出者", "{traitNoun}、王族を取り戻す者"],
        kataTemplates: ["{traitKata}・ロイヤルサーチ", "{traitKata}・セイヴィア"]
    },
];
