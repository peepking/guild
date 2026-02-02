/**
 * UI関連の定数定義
 * @module ui_constants
 */

export const UI_CONSTANTS = {
    /** 画面ID */
    SCREENS: {
        MAIN: 'MAIN',
        MAIL: 'MAIL',
        QUESTS: 'QUESTS',
        HISTORY: 'HISTORY',
        ADVENTURERS: 'ADVENTURERS',
        OPERATION: 'OPERATION',
        ARCHIVES: 'ARCHIVES'
    },
    /** タブ名 (クエスト画面) */
    QUEST_TABS: {
        NORMAL: 'NORMAL',
        SPECIAL: 'SPECIAL'
    },
    /** タブ名 (冒険者詳細) */
    ADVENTURER_TABS: {
        STATUS: 'STATUS',
        HISTORY: 'HISTORY',
        MEIKAN: 'MEIKAN'
    },
    /** タブ名 (運営画面) */
    OPERATION_TABS: {
        FACILITY: 'FACILITY',
        POLICY: 'POLICY',
        PERSONNEL: 'PERSONNEL',
        PR: 'PR',
        SYSTEM: 'SYSTEM'
    },
    /** タブ名 (顧問詳細) */
    ADVISOR_TABS: {
        EFFECT: 'EFFECT',
        STATUS: 'STATUS',
        HISTORY: 'HISTORY',
        MEIKAN: 'MEIKAN'
    },
    /** 財務タブ */
    FINANCE_TABS: {
        DAILY: 'DAILY',
        WEEKLY: 'WEEKLY'
    },
    /** 運営方針の表示名 */
    POLICY_LABELS: {
        BALANCED: '標準',
        AGGRESSIVE: '利益追求',
        SAFE: '安全第一',
        TRAINING: '新人育成',
        COMMERCIAL: '商業振興'
    },
    /** CSSクラス */
    CLASSES: {
        ACTIVE: 'active',
        HIDDEN: 'hidden',
        WARNING: 'text-warning-light',
        DANGER: 'text-status-danger',
        SAFE: 'text-status-safe',
        SUB_TEXT: 'text-grey'
    },
    /** 通用メッセージ */
    MESSAGES: {
        NO_QUESTS: '依頼はありません',
        NO_ADVENTURERS: '派遣可能な冒険者がいません',
        SELECT_QUEST: '依頼を選択してください',
        EMPTY_STATE: '特になし'
    }
};
