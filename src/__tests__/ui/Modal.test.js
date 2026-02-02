// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from '../../ui/components/Modal.js';

describe('Modal Component', () => {
    let modal;

    beforeEach(() => {
        // Mock DOM
        document.body.innerHTML = '';
        modal = new Modal();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create overlay element on init', () => {
        const overlay = document.getElementById('modal-overlay');
        expect(overlay).not.toBeNull();
        expect(overlay.classList.contains('hidden')).toBe(true);
    });

    it('should show alert modal and resolve when closed', async () => {
        const promise = modal.alert('Test Message', 'Test Title');

        const overlay = document.getElementById('modal-overlay');
        expect(overlay.classList.contains('visible')).toBe(true);
        expect(document.getElementById('modal-title').textContent).toBe('Test Title');
        expect(document.getElementById('modal-body').textContent).toBe('Test Message');

        // Find OK button
        const buttons = document.querySelectorAll('#modal-actions button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].textContent).toBe('OK');

        // Click OK
        buttons[0].click();

        await expect(promise).resolves.toBe(true);
        expect(overlay.classList.contains('hidden')).toBe(true);
    });

    it('should show confirm modal and resolve true on OK', async () => {
        const promise = modal.confirm('Are you sure?', 'Confirmation');

        const buttons = document.querySelectorAll('#modal-actions button');
        expect(buttons.length).toBe(2); // Cancel, OK
        expect(buttons[1].textContent).toBe('OK');

        buttons[1].click();

        await expect(promise).resolves.toBe(true);
    });

    it('should show confirm modal and resolve false on Cancel', async () => {
        const promise = modal.confirm('Are you sure?', 'Confirmation');

        const buttons = document.querySelectorAll('#modal-actions button');
        expect(buttons[0].textContent).toBe('キャンセル');

        buttons[0].click();

        await expect(promise).resolves.toBe(false);
    });
});
