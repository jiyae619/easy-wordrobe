import { describe, expect, it } from 'vitest';
import { sanitizeUiCopy } from '../agentOutputGuards';

describe('sanitizeUiCopy (no em dashes in UI copy)', () => {
    it('turns a dash used as a pause into a comma', () => {
        expect(sanitizeUiCopy('Olive on olive — the cardigan does the rest.')).toBe('Olive on olive, the cardigan does the rest.');
        expect(sanitizeUiCopy('Rain later–grab a layer.')).toBe('Rain later, grab a layer.');
    });

    it('never leaves a stray comma at the start or before punctuation', () => {
        expect(sanitizeUiCopy('— Go for it —.')).toBe('Go for it.');
    });
});
