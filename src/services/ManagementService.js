
import { POLICIES, ADVISOR_ROLES, RANDOM_EVENTS, FACILITIES, CAMPAIGNS } from '../data/ManagementData.js';
import { CONSTANTS, ADVISOR_CONFIG, ADVENTURER_TYPES, ADVENTURER_JOB_NAMES, ADVENTURER_RANKS, MANAGEMENT_CONFIG } from '../data/constants.js';
import { REGIONAL_NAMES } from '../data/Names.js';

/**
 * ギルドの管理（財政、アクティビティ、顧問）を行うサービス
 */
export class ManagementService {
    /**
     * コンストラクタ
     * @param {object} uiManager - UIマネージャー
     */
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * ポリシー、イベント、給与の日次更新
     * @param {object} guild 
     */
    dailyUpdate(guild) {
        // 1. 給与支払い (月次)
        if (guild.day > 0 && guild.day % ADVISOR_CONFIG.SALARY_INTERVAL === 0) {
            this._payAdvisorSalaries(guild);
        }

        // 1.5 契約満了チェック (招聘顧問)
        this._checkAdvisorContracts(guild);

        // 2. イベントタイマー更新
        this._updateEvents(guild);

        // 3. 施設収益 (売店&酒場)
        this._processFacilityIncome(guild);

        // 4. 新規イベント抽選
        if (guild.activeEvents.length === 0) {
            if (Math.random() < MANAGEMENT_CONFIG.RANDOM_EVENT_CHANCE) {
                this._triggerRandomEvent(guild);
            }
        }

        // 5. 名鑑(経歴)更新 (30日ごと)
        if (guild.day > 0 && guild.day % 30 === 0) {
            guild.adventurers.forEach(adv => {
                if (adv.updateBio) {
                    const careerData = {
                        questCount: Object.values(adv.records.quests).reduce((a, b) => a + b, 0),
                        topMonster: adv.records.majorKills.length > 0 ? adv.records.majorKills[0].name : null,
                        topQuestType: this._getTopQuestType(adv.records.quests),
                    };
                    adv.updateBio('CAREER', { careerData });
                }
            });
        }
    }

    /**
     * 最も多いクエストタイプを取得します。
     * @param {object} quests 
     * @returns {string|null}
     * @private
     */
    _getTopQuestType(quests) {
        let max = 0;
        let type = null;
        for (const [k, v] of Object.entries(quests)) {
            if (v > max) {
                max = v;
                type = k;
            }
        }
        return type;
    }

    /**
     * 施設からの収益を計算し、適用します。
     * @param {object} guild 
     * @private
     */
    _processFacilityIncome(guild) {
        const advCount = guild.adventurers.length;
        if (advCount === 0) return;

        let totalIncome = 0;
        const details = [];

        // グローバル補正 (市場需要)
        const globalMods = this.getGlobalModifiers(guild);
        const marketMod = globalMods.market || 1.0;

        // 売店収益: 2G * Lv * 人数
        const shopLv = (guild.facilities && guild.facilities.shop) || 0;
        if (shopLv > 0) {
            const income = Math.floor(MANAGEMENT_CONFIG.FACILITY_INCOME.SHOP_MULTIPLIER * shopLv * advCount * marketMod);
            totalIncome += income;
            details.push({ reason: `売店売上 (Lv.${shopLv})`, amount: income });
        }

        // 酒場収益: 3G * Lv * 人数
        const tavernLv = (guild.facilities && guild.facilities.tavern) || 0;
        if (tavernLv > 0) {
            const income = Math.floor(MANAGEMENT_CONFIG.FACILITY_INCOME.TAVERN_MULTIPLIER * tavernLv * advCount * marketMod);
            totalIncome += income;
            details.push({ reason: `酒場売上 (Lv.${tavernLv})`, amount: income });
        }

        if (totalIncome > 0) {
            guild.money += totalIncome;
            if (guild.todayFinance) {
                guild.todayFinance.income += totalIncome;
                guild.todayFinance.balance = guild.money;
                guild.todayFinance.details.push(...details);
            }
            // this.uiManager.log(`施設収益: +${totalIncome}G`, 'info'); // スパム削減のため任意で無効化
        }
    }

    /**
     * 顧問の給与を支払います。
     * @param {object} guild 
     * @private
     */
    _payAdvisorSalaries(guild) {
        if (guild.advisors.length === 0) return;

        const totalSalary = guild.advisors.length * ADVISOR_CONFIG.SALARY;
        if (guild.money >= totalSalary) {
            guild.money -= totalSalary;
            if (guild.todayFinance) {
                guild.todayFinance.expense += totalSalary;
                guild.todayFinance.balance = guild.money;
                guild.todayFinance.details.push({ reason: `顧問給与(${guild.advisors.length}名)`, amount: -totalSalary });
            }
            this.uiManager.log(`顧問団への給与(計${totalSalary}G)を支払いました。`, 'info');
        } else {
            // 借金 / 警告
            this.uiManager.log(`資金不足のため顧問への給与(${totalSalary}G)が未払いです。`, 'warning');
        }
    }

    /**
     * イベントの残り日数を更新します。
     * @param {object} guild 
     * @private
     */
    _updateEvents(guild) {
        for (let i = guild.activeEvents.length - 1; i >= 0; i--) {
            const evt = guild.activeEvents[i];
            evt.remainingDays--;
            if (evt.remainingDays <= 0) {
                // Auto-Repeat Logic
                let renewalSuccess = false;
                if (evt.autoRepeat && CAMPAIGNS[evt.id]) {
                    const campaign = CAMPAIGNS[evt.id];
                    if (guild.money >= campaign.cost) {
                        guild.money -= campaign.cost;
                        evt.remainingDays = campaign.duration;
                        renewalSuccess = true;

                        // Log Finance
                        if (guild.todayFinance) {
                            guild.todayFinance.expense += campaign.cost;
                            guild.todayFinance.balance = guild.money;
                            guild.todayFinance.details.push({
                                reason: `広報活用: ${campaign.name} (自動継続)`,
                                amount: -campaign.cost
                            });
                        }
                        this.uiManager.log(`キャンペーン「${evt.name}」を自動継続しました。`, 'info');
                    } else {
                        this.uiManager.log(`資金不足のためキャンペーン「${evt.name}」を自動継続できませんでした。`, 'warning');
                    }
                }

                if (!renewalSuccess) {
                    guild.activeEvents.splice(i, 1);
                    this.uiManager.log(`イベント「${evt.name}」が終了しました。`, 'info');
                }
            }
        }
    }

    /**
     * ランダムイベントを発生させます。
     * @param {object} guild 
     * @private
     */
    _triggerRandomEvent(guild) {
        const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        // 既にアクティブかチェック (重複は延長かスタックか? 今は最大1つに単純化)
        if (guild.activeEvents.length > 0) return;

        guild.activeEvents.push({
            id: event.id,
            name: event.name,
            description: event.description,
            mod: event.mod,
            remainingDays: event.duration
        });
        this.uiManager.log(`【イベント発生】${event.name}: ${event.description}`, 'event');
    }

    /**
     * 顧問契約の有効期限をチェックします。
     * @param {object} guild 
     * @private
     */
    _checkAdvisorContracts(guild) {
        if (!guild.advisors) return;

        for (let i = guild.advisors.length - 1; i >= 0; i--) {
            const adv = guild.advisors[i];
            if (adv.remainingContract !== undefined) {
                adv.remainingContract--;
                if (adv.remainingContract <= 0) {
                    guild.advisors.splice(i, 1);
                    this.uiManager.log(`顧問 ${adv.name} は任期満了に伴い退任しました。`, 'info');
                } else if (adv.remainingContract === 5) {
                    this.uiManager.log(`顧問 ${adv.name} の任期が残り5日です。`, 'warning');
                }
            }
        }
    }

    // --- Policy ---
    // --- 方針 ---
    /**
     * 方針変更可能か判定します。
     * @param {object} guild 
     * @returns {boolean}
     */
    canChangePolicy(guild) {
        // いつでも変更可能に変更 (ユーザー要望)
        return true;
    }

    /**
     * 方針を設定します。
     * @param {object} guild 
     * @param {string} policyId 
     * @returns {boolean}
     */
    setPolicy(guild, policyId) {
        if (!POLICIES[policyId]) return false;
        guild.activePolicy = policyId;
        const p = POLICIES[policyId];
        this.uiManager.log(`ギルドの方針を「${p.name}」に変更しました。`, 'info');
        return true;
    }

    /**
     * 現在の方針を取得します。
     * @param {object} guild 
     * @returns {object}
     */
    getPolicy(guild) {
        return POLICIES[guild.activePolicy] || POLICIES.BALANCED;
    }

    // --- 顧問 ---
    // 冒険者が引退したときに呼び出し (ランクB+のみ)
    /**
     * 顧問契約のオファーメールを送信します。
     * @param {object} guild 
     * @param {Adventurer} adventurer 
     * @param {object} mailService 
     * @returns {void}
     */
    sendAdvisorOfferMail(guild, adventurer, mailService) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) return;

        // Create mail
        const title = "【顧問契約の申し出】";
        const message = `${adventurer.name}より:\n\nお世話になりました。\n冒険者としての活動は引退いたしますが、\nこれまでの経験を活かし、ギルドの顧問として貢献したいと考えております。\n\nもしよろしければ、顧問契約の締結をご検討ください。\n(賃金: ${ADVISOR_CONFIG.SALARY}G / 30日)`;

        // 候補者データをメールの「ペイロード」に保存するか、グローバルに保存するか？
        // 単純化のため、すでに引退者リストにある場合は冒険者オブジェクトIDを使用できる。
        // または一時オブジェクトをリストに保存するか？
        // よい方法: 必要であれば `advisorCandidates` をこの対話状態のために厳密に使用するが、
        // メール内にボタンを配置したいため、データをメールアクション経由で渡す。

        const candidateData = {
            id: adventurer.id,
            name: adventurer.name,
            type: adventurer.type,
            rankLabel: adventurer.rankLabel,
            stats: adventurer.stats
        };

        if (mailService) {
            mailService.send(
                title,
                message,
                'NORMAL',
                candidateData,
                'ADVISOR_OFFER' // Action ID
            );
        }
    }

    /**
     * 顧問を雇用します。
     * @param {object} guild 
     * @param {object} candidateData 
     * @returns {object} 結果メッセージ
     */
    hireAdvisor(guild, candidateData) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) {
            this.uiManager.log(`顧問枠がいっぱいです。(最大${ADVISOR_CONFIG.MAX_ADVISORS}名)`, 'warning');
            return { success: false, message: '顧問枠がいっぱいです' };
        }

        // 重複チェック (IDに依存すべき)
        if (guild.advisors.find(a => a.id === candidateData.id)) {
            return { success: false, message: '既に雇用されています' };
        }

        // 効果の決定
        let config = ADVISOR_CONFIG.EFFECTS[candidateData.type] || ADVISOR_CONFIG.EFFECTS.DEFAULT;
        if (candidateData.isHeadhunted) {
            config = ADVISOR_CONFIG.EFFECTS.HEADHUNTED;
        }

        const advisor = {
            ...candidateData,
            effect: config,
            hiredDay: guild.day
        };

        guild.advisors.push(advisor);
        this.uiManager.log(`${advisor.name} と顧問契約を結びました。`, 'success');
        return { success: true, message: '雇用しました' };
    }

    // 新規: 外部招聘 ("汎用顧問")
    /**
     * 外部から顧問を招聘します。
     * @param {object} guild 
     * @returns {boolean}
     */
    headhuntAdvisor(guild) {
        if (guild.advisors.length >= ADVISOR_CONFIG.MAX_ADVISORS) {
            this.uiManager.log('顧問枠がいっぱいです。', 'warning');
            return false;
        }
        if (guild.money < ADVISOR_CONFIG.HEADHUNT_COST) {
            this.uiManager.log('資金が足りません。', 'warning');
            return false;
        }

        guild.money -= ADVISOR_CONFIG.HEADHUNT_COST;
        if (guild.todayFinance) {
            guild.todayFinance.expense += ADVISOR_CONFIG.HEADHUNT_COST;
            guild.todayFinance.balance = guild.money;
            guild.todayFinance.details.push({ reason: '外部招聘費', amount: -ADVISOR_CONFIG.HEADHUNT_COST });
        }

        // 地域名の決定 (中央都市のロジックと同様、全地域からランダム)
        const regionKeys = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
        const randomRegion = regionKeys[Math.floor(Math.random() * regionKeys.length)];
        const nameList = REGIONAL_NAMES[randomRegion];
        const randomName = nameList[Math.floor(Math.random() * nameList.length)];

        // ランクBの招聘顧問用の固定ステータス
        const id = `headhunt_${guild.day}_${Math.floor(Math.random() * 1000)}`;
        const candidateData = {
            id: id,
            name: randomName,
            type: 'HEADHUNTED',
            rankLabel: 'B',
            roleName: '招聘顧問',
            salary: ADVISOR_CONFIG.SALARY,
            isHeadhunted: true,
            remainingContract: ADVISOR_CONFIG.HEADHUNT_TERM, // 90日
            stats: {} // ロジックではあまり使用されないが、必要に応じてフレーバーステータスを追加可能
        };

        this.hireAdvisor(guild, candidateData);
        return true;
    }

    // 新規: 任命 (現役のランクB+冒険者を昇進)
    /**
     * 現役冒険者を顧問に任命します。
     * @param {object} guild 
     * @param {string} adventurerId 
     * @returns {object} 結果
     */
    appointAdvisor(guild, adventurerId) {
        const advIndex = guild.adventurers.findIndex(a => a.id === adventurerId);
        if (advIndex === -1) return false;
        const adv = guild.adventurers[advIndex];

        // 1. 強制引退ロジック
        // アクティブリストから削除
        guild.adventurers.splice(advIndex, 1);

        // 引退リストに追加 (理由は 'APPOINTMENT' を設定、ここでは標準の 'RETIRE' を使用)
        const retiredData = {
            ...adv,
            leftDay: guild.day,
            reason: 'RETIRE' // 標準タイプ 'RETIRE' を使用
        };

        if (!guild.retiredAdventurers) guild.retiredAdventurers = [];
        guild.retiredAdventurers.push(retiredData);

        // 履歴ログを追加
        if (!retiredData.history) retiredData.history = [];
        retiredData.history.push({ day: guild.day, text: 'ギルド顧問に任命され、現役を引退。' });

        this.uiManager.log(`${adv.name} は現役を引退し、顧問に就任しました。`, 'success');

        // 2. 顧問として雇用
        const candidateData = {
            id: adv.id,
            name: adv.name,
            type: adv.type,
            rankLabel: adv.rankLabel,
            stats: adv.stats,
            roleName: '顧問',
            bio: adv.bio,
            origin: adv.origin,
            history: adv.history // 参照渡しでOK (物語上は同一人物なので)
        };

        return this.hireAdvisor(guild, candidateData);
    }

    // 解雇なし (ユーザー要望)
    /**
     * 顧問を解雇します（未実装）。
     * @param {object} guild 
     * @param {string} advisorId 
     * @returns {boolean}
     */
    fireAdvisor(guild, advisorId) {
        return false;
    }

    // 合計補正値を取得するヘルパー
    /**
     * 現在のギルドに対する全補正値（ポリシー、顧問、イベント）を計算して返します。
     * @param {object} guild 
     * @returns {object} 補正値オブジェクト
     */
    getGlobalModifiers(guild) {
        const mods = { ...POLICIES[guild.activePolicy].mod }; // 方針補正をコピー

        // 顧問補正を追加 (同職の重複減衰あり)
        const jobCounts = {};
        guild.advisors.forEach(adv => {
            const eff = adv.effect;
            const typeKey = adv.type;

            jobCounts[typeKey] = (jobCounts[typeKey] || 0) + 1;
            const count = jobCounts[typeKey]; // 1から始まるインデックス (1人目, 2人目...)

            // 減衰係数: 1.0, 0.5, 0.25... (1 / 2^(n-1))
            const factor = 1 / Math.pow(2, count - 1);

            // キーに基づいて決定:
            // 加算 (ADDITIVE): power, success
            // 乗算 (MULTIPLICATIVE): injury, penalty, growth, fame, reward

            // 乗算の場合の、係数による減衰の扱いについて:
            // 例: 報酬 +5% (1.05)。2人目は +2.5% (1.025)。
            // 式: 新規倍率 = 1 + (基本倍率 - 1) * 係数
            // 例: 1.05 -> (0.05 * 1.0) + 1 = 1.05
            // 例: 1.05 (2回目) -> (0.05 * 0.5) + 1 = 1.025

            const ADDITIVE_KEYS = ['power', 'success'];

            // eff は { power: 0.04, desc: ... } のようなオブジェクト、あるいは古い形式 { type:..., val:... }
            // 新しい定数更新により { power: 0.04, desc: ... } となっているはず。
            // しかし、レガシー対応や直接アクセスの可能性を考慮する必要がある。

            let effects = eff;
            if (eff.type && eff.val) {
                // レガシースタイルかチェック (新しい定数では起こらないはずだが、念のため維持)
                // 定数を置き換えたばかりなので、今のところレガシー正規化はスキップ。
                effects = typeof eff.val === 'object' ? eff.val : { [eff.type]: eff.val };
            }

            for (const [k, v] of Object.entries(effects)) {
                if (k === 'desc' || k === 'type') continue;

                if (ADDITIVE_KEYS.includes(k)) {
                    // 加算: 単純に加算 (値 * 係数)
                    mods[k] = (mods[k] || 0) + (v * factor);
                } else {
                    // 乗算: (値 - 1) * 係数 + 1
                    // 例: 0.96 (-4%) -> -0.04 * 係数 -> 結果 + 1
                    // mods[k] が未定義の場合は 1.0 から開始
                    // 倍率を累積する必要がある。
                    // 合計 = Base * M1 * M2...
                    // なので、既存の補正値に乗算する。

                    const baseDiff = v - 1.0;
                    const effectiveDiff = baseDiff * factor;
                    const effectiveMult = 1.0 + effectiveDiff;

                    mods[k] = (mods[k] || 1.0) * effectiveMult;
                }
            }
        });

        // イベント補正を追加
        guild.activeEvents.forEach(evt => {
            if (evt.mod) {
                for (const [k, v] of Object.entries(evt.mod)) {
                    mods[k] = (mods[k] || 1.0) * v;
                }
            }
        });

        return mods;
    }
}
