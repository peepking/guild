import { QuestService } from '../services/QuestService.js';
import { RecruitmentService } from '../services/RecruitmentService.js';
import { AssignmentService } from '../services/AssignmentService.js';
import { LifeEventService } from '../services/LifeEventService.js';
import { StorageService } from '../services/StorageService.js';

import { titleService } from '../services/TitleService.js';
import { TYPE_ADVANTAGES, LEAVE_TYPES, GUILD_RANK_THRESHOLDS, LEAVE_TYPE_NAMES, RETIREMENT_CONFIG, JOIN_TYPES } from '../data/constants.js';
import { MESSAGES } from '../data/messages.js';

/**
 * ゲームのメインループと進行を管理するコアクラス
 */
export class GameLoop {
    /**
     * コンストラクタ
     * @param {Guild} guild - ギルドモデル
     * @param {UIManager} uiManager - UIマネージャー
     * @param {QuestService} questService - クエスト管理サービス
     * @param {MailService} mailService - メールサービス
     * @param {ManagementService} managementService - 運営管理サービス
     * @param {EquipmentService} equipmentService - 装備サービス
     * @param {RecruitmentService} recruitmentService - スカウトサービス
     */
    constructor(guild, uiManager, questService, mailService, managementService, equipmentService, recruitmentService) {
        this.guild = guild;
        this.uiManager = uiManager;
        this.questService = questService || new QuestService();
        this.mailService = mailService;
        this.managementService = managementService;
        this.storageService = new StorageService();

        // タイトルサービスの初期化
        if (this.mailService) {
            titleService.setMailService(this.mailService);
        }
        this.equipmentService = equipmentService;
        this.recruitmentService = recruitmentService || new RecruitmentService(guild);
        this.assignmentService = new AssignmentService(guild, this.questService, uiManager);
        this.lifeEventService = new LifeEventService(uiManager);

        this.activeQuests = [];   // 受注可能
        this.ongoingQuests = [];  // 進行中
        this.plannedQuests = [];  // 出発準備中（未出発）
        this.questHistory = [];   // 完了済みログアーカイブ

        // トーナメント状態の初期化
        if (!this.guild.tournament) {
            this.guild.tournament = { solo: 'E', team: 'E' };
        }

        // 魔王軍侵攻状態の初期化
        if (!this.guild.demonInvasion) {
            this.guild.demonInvasion = {
                status: 'QUIET', // QUIET, ACTIVE
                offensePhase: 1, // 1-3
                defensePhase: 1, // 1-3
                raidAvailable: false
            };
        }
    }

    /**
     * クエスト履歴をアーカイブします。
     * @param {object} snapshot - クエスト結果のスナップショット
     * @returns {void}
     */
    archiveQuest(snapshot) {
        this.questHistory.unshift(snapshot);
        if (this.questHistory.length > 1000) {
            this.questHistory.pop();
        }
    }

    /**
     * 日付を変更し、1日のシミュレーションを実行します。
     * @returns {void}
     */
    nextDay() {
        // ランク昇格通知用に前回のランクを保持 (現在はギルドステート内で利用可能)

        this.guild.day++;
        this.uiManager.log(`--- ${this.guild.day}日目 開始 ---`, 'day-start');

        // 財務: 本日分初期化
        this.guild.todayFinance = {
            day: this.guild.day,
            income: 0,
            expense: 0,
            balance: this.guild.money,
            details: []
        };
        this.guild.financeHistory.unshift(this.guild.todayFinance);
        if (this.guild.financeHistory.length > 1000) {
            this.guild.financeHistory.pop();
        }

        // --- 0. 出発処理（前日計画分） ---
        // 参加費チェック（トーナメント等）
        for (let i = this.plannedQuests.length - 1; i >= 0; i--) {
            const plan = this.plannedQuests[i];
            if (plan.quest.entryFee) {
                if (this.guild.money >= plan.quest.entryFee) {
                    this.guild.money -= plan.quest.entryFee;
                    this.uiManager.log(`参加費 ${plan.quest.entryFee}G を支払いました。(${plan.quest.title})`);
                } else {
                    this.uiManager.log(`資金不足のため参加費を払えず、依頼をキャンセルしました。(${plan.quest.title})`, 'error');
                    this.assignmentService.cancelAssignment(plan, this.ongoingQuests, this.plannedQuests);
                }
            }
        }

        const departedCount = this.assignmentService.confirmAssignments(this.plannedQuests, this.ongoingQuests);
        this.plannedQuests = []; // クリア
        // 出発済みクエストは既にactiveQuestsから除外済み

        // --- 1. ライフサイクルと回復チェック ---
        for (let i = this.guild.adventurers.length - 1; i >= 0; i--) {
            const adv = this.guild.adventurers[i];

            // フェーズ9: キャリア成長 (毎日適用)
            adv.careerDays = (adv.careerDays || 0) + 1;

            // 回復
            if (adv.recoveryDays > 0) {
                // 医務室効果: 基礎1 + Lv
                const infirmaryLv = (this.guild.facilities && this.guild.facilities.infirmary) || 0;
                const recoveryAmount = 1 + infirmaryLv;

                adv.recoveryDays -= recoveryAmount;
                if (adv.recoveryDays <= 0) {
                    adv.state = "IDLE";
                    adv.recoveryDays = 0; // Clamp
                    this.uiManager.log(`${adv.name} は傷が癒えました。`, 'recover');
                } else {
                    continue;
                }
            }

            // 離脱/引退チェック (IDLE時のみ)
            if (adv.state === "IDLE" && adv.isAvailable()) {
                // キャリアボーナス (滞在による微量なランク上昇)
                // 0.05 * (1 + EMA) * decay
                const ema = adv.perfEMA || 0;
                const cap = Math.max(0, (1000 - adv.rankValue) / 1000);
                let careerBonus = 0.05 * (1 + ema);
                careerBonus *= cap;
                if (careerBonus > 0) adv.updateRank(careerBonus);

                // --- 離脱判定 ---
                // 最低在籍日数チェック (短期離脱防止)
                if ((adv.careerDays || 0) < RETIREMENT_CONFIG.MIN_CAREER_DAYS) continue;

                // 基本離脱率 (雇用形態依存)
                let leaveChance = RETIREMENT_CONFIG.BASE_LEAVE_CHANCE[adv.joinType] || RETIREMENT_CONFIG.BASE_LEAVE_CHANCE.WANDERER;

                // 信頼度補正
                if (adv.trust >= RETIREMENT_CONFIG.TRUST_MODIFIER.HIGH_THRESHOLD) {
                    leaveChance -= RETIREMENT_CONFIG.TRUST_MODIFIER.HIGH_REDUCTION;
                } else if (adv.trust < RETIREMENT_CONFIG.TRUST_MODIFIER.LOW_THRESHOLD) {
                    leaveChance += RETIREMENT_CONFIG.TRUST_MODIFIER.LOW_INCREASE;
                }

                // 確率の下限は 0 (信頼度が高くても完全定着ではないかもしれないが、現状データではマイナスになりうるのでクランプ)
                // Local (0.0001) - HighTrust (0.004) < 0 -> 0% (安全)
                if (leaveChance < 0) leaveChance = 0;

                if (Math.random() < leaveChance) {
                    let type = LEAVE_TYPES.LEAVE;
                    if (adv.trust > 60) type = LEAVE_TYPES.RETIRE;
                    else if (adv.trust < 0) type = LEAVE_TYPES.DISAPPEAR;

                    const reasonStr = LEAVE_TYPE_NAMES[type] || type;
                    adv.history.push({
                        day: this.guild.day,
                        text: `${this.guild.day}日目に記録: ${reasonStr}`
                    });

                    // Add metadata for archive
                    adv.leftDay = this.guild.day;
                    adv.reason = type;

                    this.guild.retiredAdventurers.push(adv);

                    // 引退時は顧問候補に追加
                    // 引退時は顧問候補としてメール送信 (ランクB以上など条件を入れるならここかサービス内)
                    if (type === LEAVE_TYPES.RETIRE && this.managementService) {
                        // ランク条件などは sendAdvisorOfferMail 内でチェックしても良いが、
                        // ここでは無条件または簡易チェックでサービスに委譲
                        this.managementService.sendAdvisorOfferMail(this.guild, adv, this.mailService);
                    }

                    this.guild.adventurers.splice(i, 1);
                    this.uiManager.log(`${adv.name} (${adv.origin.name}) がギルドを去りました。[${type}]`, 'leave');
                }
            }
        }

        // --- 1.5 ライフイベント ---
        this.lifeEventService.processLifeEvents(this.guild);

        // --- 1.6 運営管理 (方針/給与/イベント) ---
        if (this.managementService) {
            this.managementService.dailyUpdate(this.guild);
        }

        // --- 2. 進行中クエストの処理 ---
        // グローバル補正の取得
        const globalMods = this.managementService ? this.managementService.getGlobalModifiers(this.guild) : {};
        // 施設効果を注入
        globalMods.facilities = this.guild.facilities;

        for (let i = this.ongoingQuests.length - 1; i >= 0; i--) {
            const assignment = this.ongoingQuests[i];
            assignment.nextDay();

            if (assignment.isFinished()) {
                // 解決
                const result = this.questService.attemptQuest(assignment.quest, assignment.members, globalMods);
                this._handleQuestResult(result, assignment);
                this.ongoingQuests.splice(i, 1);
            }
        }

        // --- 3. 期限切れクエストの整理 ---
        for (let i = this.activeQuests.length - 1; i >= 0; i--) {
            const q = this.activeQuests[i];

            if (q.expiresInDays === null) continue;

            const expirationDay = (q.createdDay || 0) + (q.expiresInDays || 0);
            if (this.guild.day > expirationDay) {
                this.activeQuests.splice(i, 1);
                this.uiManager.log(`期限切れのため "${q.title}" は取り下げられました。`, 'expire');

                // 期限切れクエストをアーカイブ
                this.archiveQuest({
                    id: q.id,
                    title: q.title,
                    rank: q.difficulty.rank,
                    date: this.guild.day,
                    result: 'EXPIRED',
                    members: [],
                    logs: [],
                    reward: { money: 0, reputation: 0 }
                });
            }
        }

        // --- 4. デイリークエスト生成 ---
        const newQuests = this.questService.generateDailyQuests(this.guild.day, this.guild.reputation, this.guild.facilities);
        const tourneyQuests = this.questService.generateTournamentQuests(this.guild.tournament, [...this.activeQuests, ...this.ongoingQuests.map(a => a.quest)]);
        newQuests.push(...tourneyQuests);

        // 魔王軍侵攻クエスト生成
        if (this.questService.generateDemonInvasionQuests) {
            const demonQuests = this.questService.generateDemonInvasionQuests(this.guild.day, this.guild.demonInvasion, this.guild.reputation, [...this.activeQuests, ...this.ongoingQuests.map(a => a.quest), ...tourneyQuests]);
            newQuests.push(...demonQuests);
        }

        this.activeQuests.push(...newQuests);

        // クエスト数制限
        if (this.activeQuests.length > 20) {
            const overflow = this.activeQuests.length - 20;
            if (overflow > 0) {
                // 特殊クエスト以外を優先して削除
                // 特殊クエスト以外を優先して削除
                let removed = 0;
                for (let i = 0; i < this.activeQuests.length; i++) {
                    if (!this.activeQuests[i].isSpecial && removed < overflow) {
                        this.activeQuests.splice(i, 1);
                        removed++;
                        i--;
                    }
                }
                if (this.activeQuests.length > 20) {
                    this.activeQuests = this.activeQuests.slice(-20);
                }
                if (removed > 0) this.uiManager.log("依頼掲示板がいっぱいです！ 古い依頼が破棄されました。");
            }
        }
        this.uiManager.log(`新規依頼が ${newQuests.length} 件 届きました。 (合計: ${this.activeQuests.length}件)`);

        // --- 5. 人材募集 ---
        const capacity = 10 + Math.floor(this.guild.reputation / 20);
        const newRecruit = this.recruitmentService.dailyRecruit();

        if (newRecruit) {
            if (this.guild.adventurers.length < capacity) {
                this.guild.adventurers.push(newRecruit);
                this.uiManager.log(`新たな冒険者 ${newRecruit.name} (${newRecruit.origin.name}) が加入しました！`, 'join');
            } else {
                this.uiManager.log(`冒険者 ${newRecruit.name} が加入を希望しましたが、宿舎がいっぱいのため断りました。 (定員: ${capacity})`, 'warning');
            }
        }

        // --- 6. 自動配置計画 (翌日分) ---
        // IDLEの冒険者を新規計画に割り当て
        this.plannedQuests = this.assignmentService.autoAssign(this.activeQuests);

        const plannedIds = this.plannedQuests.map(p => p.quest.id);
        if (this.plannedQuests.length > 0) {
            // "Planned" リストへ移動し、"Available" から除外
            this.activeQuests = this.activeQuests.filter(q => !plannedIds.includes(q.id));
        }

        // --- ギルドランク昇格チェック ---
        const newRankObj = GUILD_RANK_THRESHOLDS.find(r => this.guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1];
        if (newRankObj.threshold > this.guild.highestRankThreshold) {
            // 最高到達ランクの更新
            this.guild.highestRankThreshold = newRankObj.threshold;

            this.uiManager.log(`ギルドランクが【${newRankObj.label}】に昇格しました！`, 'event');
            if (this.mailService) {
                this.mailService.send(
                    'ギルドランク昇格のお知らせ',
                    `おめでとうございます。\nギルドの評判が高まり、ランクが【${newRankObj.label}: ${newRankObj.name}】に昇格しました。\n\nより高難易度の依頼が舞い込むようになるでしょう。\n今後ともギルドの発展に尽力してください。`,
                    'IMPORTANT',
                    { day: this.guild.day }
                );
            }
        }

        // --- チュートリアルメール送信 ---
        this._checkTutorialMails();

        // --- 6. デイリーイベントチェック (スカウト/弟子) ---
        if (this.recruitmentService) {
            this.recruitmentService.checkDailyEvents(this.guild.day, this.mailService);
        }

        // --- 7. 月間表彰イベント (Day % 30) ---
        if (this.guild.day % 30 === 0 && this.guild.day > 0) {
            this._handleMonthlyAward();
        }

        // --- 8. UI更新 ---
        this.uiManager.render();

        // --- 9. オートセーブ ---
        this.save();
    }

    save() {
        if (this.storageService) {
            this.storageService.save(this);
        }
    }



    _handleQuestResult(result, assignment) {
        if (result.success) {
            let cutRate = assignment.guildCutRate;
            if (result.effectiveShareMod) {
                cutRate *= result.effectiveShareMod;
            }
            const guildCut = Math.floor(result.reward.money * cutRate);
            this.guild.money += guildCut;

            // 財務ログ
            const today = this.guild.todayFinance;
            if (today) {
                today.income += guildCut;
                today.balance = this.guild.money;
                today.details.push({
                    reason: `依頼達成: ${result.quest.title}`,
                    amount: guildCut
                });
            }

            this.guild.reputation += result.reward.reputation;

            // 残りの報酬をパーティに分配
            const partyShare = result.reward.money - guildCut;
            if (partyShare > 0 && result.party.length > 0) {
                const perMember = Math.floor(partyShare / result.party.length);
                result.party.forEach(adv => {
                    adv.personalMoney = (adv.personalMoney || 0) + perMember;
                    adv.trust += 1;
                });
            } else {
                result.party.forEach(adv => adv.trust += 1);
            }

            // 装備強化チャンス (30%)
            if (this.equipmentService) {
                result.party.forEach(adv => {
                    if (Math.random() < 0.3) { // 30% chance to try shopping
                        // 30%の確率で買い物
                        const upg = this.equipmentService.upgradeEquipment(adv);
                        if (upg.success) {
                            this.uiManager.log(`${adv.name} は新装備「${upg.equipment.name}」を購入しました。(-${upg.cost}G)`, 'info');
                        }
                    }
                });
            }

            let msg = `クエスト達成! "${result.quest.title}" ギルド収入: +${guildCut}G`;
            if (result.reward.breakdown) {
                const bd = result.reward.breakdown;
                msg += ` (基本:${bd.base} + 討伐:${bd.freeHunt} + 素材:${bd.materials})`;
            } else {
                msg += ` (報酬総額: ${result.reward.money}G)`;
            }
            this.uiManager.log(msg, 'success');

            // トーナメント完了処理
            if (result.quest.isTournament) {
                const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
                const currentRank = result.quest.difficulty.rank;
                const currentRankIdx = ranks.indexOf(currentRank);

                if (currentRankIdx === -1) {
                    console.error("Tournament Rank Error: Invalid Rank", currentRank);
                } else {
                    const nextRankIdx = currentRankIdx + 1;
                    const nextRank = nextRankIdx < ranks.length ? ranks[nextRankIdx] : 'COMPLETED';

                    if (result.quest.type === 'TOURNAMENT_SOLO') {
                        this.guild.tournament.solo = nextRank;
                        if (this.mailService) {
                            if (nextRank === 'COMPLETED') {
                                this.mailService.send(
                                    '【祝】天下一武闘会（個人）完全制覇！',
                                    'Sランク戦での優勝、誠におめでとうございます！\n貴ギルドの武名は今や世界中に轟き、伝説として語り継がれることでしょう。\n\nもはやこの地に敵う者はおりません。貴殿こそが真の最強です！\nこれにて天下一武闘会への挑戦権は全て制覇されました。\n（※これ以上のランクはありませんが、引き続きギルド運営をお楽しみください）',
                                    'IMPORTANT'
                                );
                            } else {
                                this.mailService.send('天下一武闘会（個人）制覇通知', `${currentRank}ランク戦を勝利しました！\n次は${nextRank}ランクへの挑戦権が得られます。`, 'IMPORTANT');
                            }
                        }
                    } else if (result.quest.type === 'TOURNAMENT_TEAM') {
                        this.guild.tournament.team = nextRank;
                        if (this.mailService) {
                            if (nextRank === 'COMPLETED') {
                                this.mailService.send(
                                    '【祝】天下一武闘会（団体）完全制覇！',
                                    'Sランク戦での優勝、誠におめでとうございます！\n貴ギルドの結束と武名は今や世界中に轟き、伝説として語り継がれることでしょう。\n\nもはやこの地に敵う者たちはいません。貴殿らこそが真の最強チームです！\nこれにて天下一武闘会への挑戦権は全て制覇されました。\n（※これ以上のランクはありませんが、引き続きギルド運営をお楽しみください）',
                                    'IMPORTANT'
                                );
                            } else {
                                this.mailService.send('天下一武闘会（団体）制覇通知', `${currentRank}ランク戦を勝利しました！\n次は${nextRank}ランクへの挑戦権が得られます。`, 'IMPORTANT');
                            }
                        }
                    }
                }
            }

            // 魔王軍侵攻進行処理
            if (this.guild.demonInvasion) {
                const type = result.quest.type;
                const invasion = this.guild.demonInvasion;

                // 攻勢フェーズ
                if (type === 'OFFENSE_BREAKTHROUGH') {
                    invasion.offensePhase = 2;
                    this.uiManager.log('【魔王軍侵攻】攻勢フェーズが進みました！ 次は野営地奇襲です。', 'event');
                } else if (type === 'OFFENSE_CAMP_RAID') {
                    invasion.offensePhase = 3;
                    this.uiManager.log('【魔王軍侵攻】攻勢フェーズが進みました！ 次は敵将討ち取りです。', 'event');
                } else if (type === 'OFFENSE_GENERAL_HUNT') {
                    invasion.offensePhase = 1;
                    this.uiManager.log('【魔王軍侵攻】敵将を討ち取り、攻勢作戦が完了しました！', 'event');
                    if (Math.random() < 0.3) {
                        invasion.raidAvailable = true;
                        this.uiManager.log('【魔王軍侵攻】敵幹部の動きを察知しました！ (レイド発生)', 'warning');
                    }
                }

                // 防衛フェーズ
                if (type === 'DEFENSE_FRONTLINE') {
                    invasion.defensePhase = 2;
                    this.uiManager.log('【魔王軍侵攻】防衛フェーズが進みました！ 次は補給路確保です。', 'event');
                } else if (type === 'DEFENSE_SUPPLY') {
                    invasion.defensePhase = 3;
                    this.uiManager.log('【魔王軍侵攻】防衛フェーズが進みました！ 次は砦防衛戦です。', 'event');
                } else if (type === 'DEFENSE_FORT') {
                    invasion.defensePhase = 1;
                    this.uiManager.log('【魔王軍侵攻】砦を守り抜き、防衛作戦が完了しました！', 'event');
                    if (Math.random() < 0.3) {
                        invasion.raidAvailable = true;
                        this.uiManager.log('【魔王軍侵攻】敵幹部の動きを察知しました！ (レイド発生)', 'warning');
                    }
                }

                // レイド
                if (type === 'RAID_GENERAL_SUBJUGATION') {
                    invasion.raidAvailable = false;
                    this.uiManager.log('【魔王軍侵攻】魔王軍幹部を撃破！ 敵軍は一時撤退しました。', 'event');
                }
            }
        } else {
            let penaltyMoney = result.effectivePenalty ? result.effectivePenalty.money : (result.quest.penalty ? result.quest.penalty.money : 0);
            let penaltyRep = result.quest.penalty ? result.quest.penalty.reputation : 0;

            this.guild.money -= penaltyMoney;

            // Finan    ce Logging
            // 財務ログ
            const today = this.guild.todayFinance;
            if (today) {
                today.expense += penaltyMoney;
                today.balance = this.guild.money;
                today.details.push({
                    reason: `違約金: ${result.quest.title}`,
                    amount: -penaltyMoney
                });
            }

            this.guild.reputation -= penaltyRep;
            result.party.forEach(adv => adv.trust -= 2);

            this.uiManager.log(`クエスト失敗... "${result.quest.title}" 違約金: -${penaltyMoney}G`, 'error');
        }

        result.memberResults.forEach(mr => {
            if (mr.status === 'DEAD') {
                const adv = mr.adventurer;
                this.uiManager.log(`【訃報】${adv.name} は任務中に命を落としました...`, 'error');

                const reasonStr = LEAVE_TYPE_NAMES['DEATH'] || '殉職';
                adv.history.push({
                    day: this.guild.day,
                    text: `${this.guild.day}日目に記録: ${reasonStr}`
                });

                adv.leftDay = this.guild.day;
                adv.reason = 'DEATH';

                this.guild.retiredAdventurers.push(adv);

                const idx = this.guild.adventurers.findIndex(a => a.id === adv.id);
                if (idx !== -1) {
                    this.guild.adventurers.splice(idx, 1);
                }

            } else if (mr.status === 'INJURED') {
                mr.adventurer.state = "IDLE";
                mr.adventurer.trust -= 5;
                mr.adventurer.recoveryDays = Math.floor(Math.random() * 5) + 2;
                this.uiManager.log(`${mr.adventurer.name} は負傷しました！ (全治${mr.adventurer.recoveryDays}日)`, 'error');
            } else {
                mr.adventurer.state = "IDLE";
            }
        });

        // アーカイブ
        this.archiveQuest({
            id: result.quest.id,
            title: result.quest.title,
            rank: result.quest.difficulty.rank,
            date: this.guild.day,
            result: result.success ? 'SUCCESS' : 'FAILURE',
            members: result.party.map(a => a.name),
            logs: result.logs,
            reward: result.reward,
            isSpecial: result.quest.isSpecial,
            description: result.quest.description // 説明文を追加
        });
    }
    _handleMonthlyAward() {
        if (!this.guild.adventurers || this.guild.adventurers.length === 0) return;

        // 1. 冒険者ごとの評価上昇値を計算
        let candidates = [];
        let maxGain = -9999;

        this.guild.adventurers.forEach(adv => {
            const lastVal = adv.lastPeriodRankValue || adv.rankValue; // フォールバック
            const gain = adv.rankValue - lastVal;

            // 次期間のスナップショットを更新
            adv.lastPeriodRankValue = adv.rankValue;

            if (gain > maxGain) {
                maxGain = gain;
                candidates = [adv];
            } else if (gain === maxGain) {
                candidates.push(adv);
            }
        });

        // 2. 受賞者を選出
        if (candidates.length > 0 && maxGain > 0) {
            const winner = candidates[Math.floor(Math.random() * candidates.length)];

            // 3. ボーナス計算 (5 * ギルドランク値)
            // ギルドランク値を決定 (E=1, ..., S=6)
            // Guild.getRankLabelが存在しない可能性があるため、既存ロジックを使用
            const rankObj = this.uiManager.layout ?
                (GUILD_RANK_THRESHOLDS.find(r => this.guild.reputation >= r.threshold) || GUILD_RANK_THRESHOLDS[GUILD_RANK_THRESHOLDS.length - 1])
                : { label: 'E' }; // フォールバック

            const rankValues = { E: 1, D: 2, C: 3, B: 4, A: 5, S: 6 };
            const rankVal = rankValues[rankObj.label] || 1;

            const bonus = 5 * rankVal;

            // 4. ボーナス適用
            winner.rankValue += bonus;
            winner.updateRank(0); // ラベル更新

            // 5. メール送信
            this.mailService.send(
                "【月間表彰】MVP選出",
                `今月のギルド月間MVPは ${winner.name} に決定しました！\n期間中に最も評価を高めた功績を称え、評価値ボーナス +${bonus} を付与します。\n\n獲得評価: ${Math.floor(maxGain)}\n現在のランク: ${winner.rankLabel}`,
                "IMPORTANT",
                { day: this.guild.day }
            );

            this.uiManager.log(`月間MVP: ${winner.name} (Bonus +${bonus})`, 'event');
        }
    }
    handleMailAction(actionId, data) {
        if (actionId === 'SCOUT_ADVENTURER') {
            if (this.recruitmentService) {
                return this.recruitmentService.executeScout(data);
            }
        }
        if (actionId === 'APPRENTICE_JOIN') {
            if (this.recruitmentService) {
                return this.recruitmentService.executeApprentice(data);
            }
        }
        if (actionId === 'ADVISOR_OFFER') {
            if (this.managementService) {
                return this.managementService.hireAdvisor(this.guild, data);
            }
        }
        return { success: false, message: '不明なアクションです' };
    }

    /**
     * チュートリアルメールの定期配信チェック
     */
    _checkTutorialMails() {
        if (!this.mailService) return;

        // メッセージ定義の動的インポートはできないため、
        // 実際にはimport済みの定数を使うか、あるいはMESSAGES自体をGameLoopでimportする必要がある。
        // GameLoop内ではまだMESSAGESをimportしていないため、追加が必要。
        // ただし、MESSAGESはこのファイルのスコープ外。
        // したがって、GameLoop.jsの先頭でMESSAGESをインポートする必要がある。
        // ここでは一旦ロジックのみ記述し、別途importを追加する。

        const tutorialMails = {
            3: 'DAY_3',
            5: 'DAY_5',
            8: 'DAY_8',
            10: 'DAY_10',
            15: 'DAY_15',
            20: 'DAY_20',
            25: 'DAY_25',
            35: 'DAY_35'
        };

        const key = tutorialMails[this.guild.day];
        if (key) {
            // import { MESSAGES } from '../data/messages.js'; が必要
            const content = MESSAGES.MAIL.TUTORIAL[key];
            if (content) {
                this.mailService.send(
                    content.TITLE,
                    content.BODY,
                    'SYSTEM',
                    { day: this.guild.day }
                );
            }
        }
    }
}
