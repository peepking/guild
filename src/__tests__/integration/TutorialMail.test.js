// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameLoop } from '../../core/GameLoop.js';
import { Guild } from '../../models/Guild.js';
import { MailService } from '../../services/MailService.js';
import { MESSAGES } from '../../data/messages.js';

// Mocks
const mockUiManager = {
    log: vi.fn(),
    render: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true)
};

describe('Tutorial Mail Integration', () => {
    let gameLoop;
    let guild;
    let mailService;

    beforeEach(() => {
        guild = new Guild();
        mailService = new MailService();
        // Clear initial welcome mail
        mailService.mails = [];

        // Mock RecruitmentService to avoid side effects
        const mockRecruitmentService = {
            checkDailyEvents: vi.fn(),
            dailyRecruit: vi.fn(),
            executeScout: vi.fn()
        };

        // Minimal GameLoop setup
        gameLoop = new GameLoop(guild, mockUiManager, null, mailService, null, null, mockRecruitmentService);
    });

    it('should send tutorial mail on Day 3', () => {
        guild.day = 2;
        gameLoop.nextDay(); // Becomes Day 3

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_3.TITLE);
        expect(latestMail.body).toBe(MESSAGES.MAIL.TUTORIAL.DAY_3.BODY);
    });

    it('should send tutorial mail on Day 5', () => {
        guild.day = 4;
        gameLoop.nextDay(); // Becomes Day 5

        const mails = mailService.getMails();
        expect(mails.length).toBeGreaterThan(0);
        const latestMail = mails[0];

        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_5.TITLE);
        expect(latestMail.body).toBe(MESSAGES.MAIL.TUTORIAL.DAY_5.BODY);
    });

    it('should send tutorial mail on Day 8', () => {
        guild.day = 7;
        gameLoop.nextDay(); // Becomes Day 8

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_8.TITLE);
    });

    it('should send tutorial mail on Day 10', () => {
        guild.day = 9;
        gameLoop.nextDay(); // Becomes Day 10

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_10.TITLE);
    });

    it('should send tutorial mail on Day 15', () => {
        guild.day = 14;
        gameLoop.nextDay(); // Becomes Day 15

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_15.TITLE);
    });

    it('should send tutorial mail on Day 20', () => {
        guild.day = 19;
        gameLoop.nextDay(); // Becomes Day 20

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_20.TITLE);
    });

    it('should send tutorial mail on Day 25', () => {
        guild.day = 24;
        gameLoop.nextDay(); // Becomes Day 25

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_25.TITLE);
    });

    it('should send tutorial mail on Day 35', () => {
        guild.day = 34;
        gameLoop.nextDay(); // Becomes Day 35

        const latestMail = mailService.getMails()[0];
        expect(latestMail.title).toBe(MESSAGES.MAIL.TUTORIAL.DAY_35.TITLE);
    });

    it('should NOT send tutorial mail on other days', () => {
        guild.day = 5; // Start at 5
        gameLoop.nextDay(); // Becomes Day 6

        const mails = mailService.getMails();
        expect(mails.length).toBe(0);
    });
});
