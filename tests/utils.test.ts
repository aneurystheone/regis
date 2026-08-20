import { describe, it, expect, vi, afterEach } from 'vitest';
import { isCurrentTimeInSlot } from '../utils';

describe('isCurrentTimeInSlot', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns true when current time is within slot (24h and 12h formats)', () => {
        vi.useFakeTimers();
        // Set system time to 10:30 AM
        vi.setSystemTime(new Date('2026-03-26T10:30:00'));

        expect(isCurrentTimeInSlot('09:00 - 11:00')).toBe(true);
        expect(isCurrentTimeInSlot('10:00 - 10:45')).toBe(true);
        expect(isCurrentTimeInSlot('10:30 - 11:30')).toBe(true);
        expect(isCurrentTimeInSlot('09:00 AM - 11:00 AM')).toBe(true);
        
        expect(isCurrentTimeInSlot('08:00 - 10:00')).toBe(false);
        expect(isCurrentTimeInSlot('11:00 - 12:00')).toBe(false);
    });

    it('handles PM times and 1-7 PM shift defaults', () => {
        vi.useFakeTimers();
        // Set system time to 2:30 PM (14:30)
        vi.setSystemTime(new Date('2026-03-26T14:30:00'));

        // '2:00 - 3:00' should default to 14:00 - 15:00 due to 1-7 PM rule
        expect(isCurrentTimeInSlot('2:00 - 3:00')).toBe(true);
        expect(isCurrentTimeInSlot('02:00 PM - 03:00 PM')).toBe(true);
        expect(isCurrentTimeInSlot('14:00 - 15:00')).toBe(true);
        
        expect(isCurrentTimeInSlot('2:00 AM - 3:00 AM')).toBe(false);
    });

    it('returns false for invalid formats', () => {
        expect(isCurrentTimeInSlot('')).toBe(false);
        expect(isCurrentTimeInSlot('por definir')).toBe(false);
        expect(isCurrentTimeInSlot('10:00')).toBe(false);
    });
});
