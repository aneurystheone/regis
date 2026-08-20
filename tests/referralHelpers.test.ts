import { describe, it, expect } from 'vitest';
import {
  generateReferralCode,
  validateReferralCodeFormat,
  calculateRewardExtension,
  REFERRAL_CODE_PREFIX,
} from '../services/referralHelpers';

describe('referralHelpers', () => {
  describe('generateReferralCode', () => {
    it('generates a valid code formatted with REGIS-DOC- prefix', () => {
      const code = generateReferralCode('user_123456789');
      expect(code.startsWith(REFERRAL_CODE_PREFIX)).toBe(true);
      expect(code).toBe('REGIS-DOC-USER12');
    });

    it('handles short UIDs gracefully by padding', () => {
      const code = generateReferralCode('abc');
      expect(code).toBe('REGIS-DOC-ABCXXX');
    });

    it('handles empty or non-string UID fallback', () => {
      const code = generateReferralCode('');
      expect(code).toBe('REGIS-DOC-8K9P00');
    });
  });

  describe('validateReferralCodeFormat', () => {
    it('validates canonical REGIS referral codes', () => {
      expect(validateReferralCodeFormat('REGIS-DOC-8K9P00')).toBe(true);
      expect(validateReferralCodeFormat('REGIS-8K9P00')).toBe(true);
      expect(validateReferralCodeFormat('regis-doc-abc123')).toBe(true);
    });

    it('rejects invalid code formats', () => {
      expect(validateReferralCodeFormat('INVALID-CODE')).toBe(false);
      expect(validateReferralCodeFormat('12345')).toBe(false);
      expect(validateReferralCodeFormat('')).toBe(false);
    });
  });

  describe('calculateRewardExtension', () => {
    it('adds 30 days starting from current date when currentExpiresAt is null', () => {
      const before = new Date();
      const newExpirationIso = calculateRewardExtension(null, 30);
      const newExpiration = new Date(newExpirationIso);

      const diffDays = Math.round(
        (newExpiration.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });

    it('extends from future expiration date if currentExpiresAt is in the future', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future
      const newExpirationIso = calculateRewardExtension(futureDate.toISOString(), 30);
      const newExpiration = new Date(newExpirationIso);

      const diffDays = Math.round(
        (newExpiration.getTime() - futureDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });

    it('starts from current date if currentExpiresAt is in the past', () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days in past
      const before = new Date();
      const newExpirationIso = calculateRewardExtension(pastDate.toISOString(), 30);
      const newExpiration = new Date(newExpirationIso);

      const diffDays = Math.round(
        (newExpiration.getTime() - before.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(30);
    });
  });
});
