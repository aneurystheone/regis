/**
 * Pure functions for referral logic in REGIS.
 * Free of side-effects and tested via Vitest.
 */

/**
 * Standard prefix for canonical REGIS referral codes
 */
export const REFERRAL_CODE_PREFIX = 'REGIS-DOC-';

/**
 * Generates a deterministic referral code for a Docente based on their UID.
 * Standard format: REGIS-DOC-XXXXXX (6 alphanumeric uppercase chars derived from UID)
 */
export const generateReferralCode = (uid: string): string => {
  if (!uid || typeof uid !== 'string') {
    return `${REFERRAL_CODE_PREFIX}8K9P00`;
  }
  // Sanitize UID to uppercase alphanumeric characters
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const hashPart = cleanUid.length >= 6 ? cleanUid.slice(0, 6) : cleanUid.padEnd(6, 'X');
  return `${REFERRAL_CODE_PREFIX}${hashPart}`;
};

/**
 * Validates whether a given string adheres to the REGIS referral code format.
 * Must be of format REGIS-DOC-XXXXXX or REGIS-XXXXXX
 */
export const validateReferralCodeFormat = (code: string): boolean => {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  // Regex matches REGIS-DOC-XXXXXX or REGIS-XXXXXX (at least 4 alphanumeric chars after hyphen)
  const referralRegex = /^REGIS-(DOC-)?[A-Z0-9]{4,10}$/;
  return referralRegex.test(trimmed);
};

/**
 * Calculates new subscription expiration date when adding reward days (default 30 days).
 * Handles null (free tier / indefinite) and existing future expiration dates safely.
 */
export const calculateRewardExtension = (
  currentExpiresAt: string | null,
  rewardDays: number = 30
): string => {
  const now = new Date();
  let baseDate = now;

  if (currentExpiresAt) {
    const existingDate = new Date(currentExpiresAt);
    if (!isNaN(existingDate.getTime()) && existingDate > now) {
      baseDate = existingDate;
    }
  }

  const resultDate = new Date(baseDate.getTime() + rewardDays * 24 * 60 * 60 * 1000);
  return resultDate.toISOString();
};
