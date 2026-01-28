import { TRAIT_TITLE_DEFS, ACHIEVEMENT_TITLE_DEFS } from '../data/TitleDefinitions.js';

export class TitleService {
    constructor() {
        this.pTitleGrant = 1.0;
        this.mailService = null;
    }

    setMailService(service) {
        this.mailService = service;
    }

    /**
     * Try to generate and assign a title.
     * @param {Object} adventurer
     * @param {Object} context { questType, isBoss, bossId, rank, result, questId, region, day }
     * @returns {string|null} The new title if granted
     */
    tryGenerateTitle(adventurer, context) {
        // Eligibility Check
        if (adventurer.title) return null;
        const eligibleRanks = ['S', 'A', 'B'];
        if (!eligibleRanks.includes(adventurer.rankLabel)) return null;
        if (adventurer.daysInGuild < 30) return null;
        if ((adventurer.sRankSuccessCount || 0) < 3) return null;

        // Trigger Check
        const isSRank = context.rank === 'S' && context.result === 'SUCCESS';
        const isBoss = context.isBoss && context.result === 'SUCCESS';
        if (!isSRank && !isBoss) return null;

        // Probability Check
        if (Math.random() > this.pTitleGrant) return null;

        // --- Generation Procedure (Step 0-8) ---

        // Step 0: Trait Selection (Random Choice)
        const validTraitDefs = TRAIT_TITLE_DEFS.filter(def =>
            adventurer.traits.map(t => t.toUpperCase()).includes(def.id.toUpperCase())
        );
        if (validTraitDefs.length === 0) return null; // No usable traits
        const selectedTraitDef = validTraitDefs[Math.floor(Math.random() * validTraitDefs.length)];

        // Step 1: Determine Achievement
        let achievement = null;
        if (context.isBoss && context.bossId) {
            achievement = ACHIEVEMENT_TITLE_DEFS.find(a => a.id === context.bossId || a.id === `BOSS_${context.bossId}`);
        }

        if (!achievement && isSRank) {
            // Quest Type Mapping
            const typeUpper = context.questType.toUpperCase();
            const map = {
                'HUNT': 'QUEST_S_HUNT_CLEARED',
                'DUNGEON': 'QUEST_S_DUNGEON_CLEARED',
                'EXPLORE': 'QUEST_S_RUINS_CLEARED',
                'GUARD': 'QUEST_S_VIP_GUARD_CLEARED',
                'PATROL': 'QUEST_S_BORDER_RECON_CLEARED',
                'DISASTER': 'QUEST_S_BARRIER_CLEARED',
                'REBELLION': 'QUEST_S_REBELLION_CLEARED',
                'OTHERWORLD': 'QUEST_S_OTHERWORLD_CLEARED',
                'ORACLE': 'QUEST_S_ORACLE_CLEARED',
                'ANCIENT': 'QUEST_S_ANCIENT_BEAST_CLEARED',
                'ROYAL': 'QUEST_S_MISSING_ROYAL_CLEARED'
            };
            const targetId = map[typeUpper];
            if (targetId) {
                achievement = ACHIEVEMENT_TITLE_DEFS.find(a => a.id === targetId);
            }
        }

        if (!achievement) return null;

        // Step 2: Determine Style
        const style = Math.random() < 0.5 ? 'KANJI' : 'KATA';

        // Step 3: Get/Select Templates
        let templates = style === 'KANJI' ? achievement.kanjiTemplates : achievement.kataTemplates;

        // Fallback Logic
        if (!templates || templates.length === 0) {
            // Try invert style
            templates = style === 'KANJI' ? achievement.kataTemplates : achievement.kanjiTemplates;
            if (!templates || templates.length === 0) {
                // Generic Fallback
                const genericTemplates = style === 'KANJI'
                    ? ["{traitNoun}の英雄", "{traitAdj}英雄"]
                    : ["{traitKata}・ヒーロー", "ザ・{traitKata}"];
                templates = genericTemplates;
            }
        }

        // Step 4: Select Template
        const template = templates[Math.floor(Math.random() * templates.length)];

        // Step 5: Replacement
        const replacements = {
            '{traitNoun}': selectedTraitDef.noun,
            '{traitVerb}': selectedTraitDef.verb,
            '{traitAdj}': selectedTraitDef.adj,
            '{traitKata}': selectedTraitDef.kata,
            '{targetKanji}': achievement.targetKanji || '???',
            '{targetKata}': achievement.targetKata || '???',
        };

        let title = template;
        for (const [key, val] of Object.entries(replacements)) {
            title = title.split(key).join(val);
        }

        // Step 6: Normalize
        title = title.replace(/・/g, '・').replace(/\s+/g, ' ').trim();
        title = title.replace(/・・+/g, '・');

        // Step 7: Save
        adventurer.title = title;
        adventurer.titleMeta = {
            id: achievement.id,
            traitId: selectedTraitDef.id,
            style: style,
            questId: context.questId,
            day: context.day
        };

        // Notifications
        this._sendNotifications(adventurer, title, achievement);

        return title;
    }

    _sendNotifications(adventurer, title, achievement) {
        if (!this.mailService) return;

        const mailTitle = `【二つ名付与】${adventurer.name}`;
        const mailBody = `${adventurer.name}の偉業を称え、ギルド本部より新たな二つ名が承認されました。\n\n二つ名: 「${title}」\n\n今後とも彼らの活躍にご期待ください。`;

        this.mailService.send(
            mailTitle,
            mailBody,
            'EVENT',
            { adventurerId: adventurer.id, title: title }
        );
    }
}

export const titleService = new TitleService();
