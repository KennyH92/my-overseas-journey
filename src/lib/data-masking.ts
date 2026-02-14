/**
 * Data masking utilities for sensitive personal information.
 * Admins/managers see full data; regular users see masked versions.
 */

/**
 * Mask an ID number (IC/Passport).
 * "880101-10-5566" → "880101-**-****"
 * "A12345678" → "A123*****"
 */
export function maskIdNumber(value: string | null | undefined): string {
  if (!value) return '未设置';
  if (value.length <= 4) return value;
  // Malaysian IC format: XXXXXX-XX-XXXX
  if (value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-**-****`;
    }
  }
  // Generic: show first 4, mask rest
  return value.slice(0, 4) + '*'.repeat(value.length - 4);
}

/**
 * Mask a phone number.
 * "0123456789" → "012****789"
 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return '未设置';
  if (value.length <= 6) return value;
  const start = value.slice(0, 3);
  const end = value.slice(-3);
  return `${start}${'*'.repeat(value.length - 6)}${end}`;
}
