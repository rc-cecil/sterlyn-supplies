import { describe, expect, it } from 'vitest';
import { invitationTokenFromText } from '../src/lib/owner-invitation';

const token = 'ab12cd34'.repeat(8);
const link = `https://sterlynsupplies.netlify.app/owner-setup#token=${token}`;

describe('one-time owner invitation parsing', () => {
  it('accepts a complete token from a phone link', () => {
    expect(invitationTokenFromText(link)).toBe(token);
  });
  it('accepts the full JSON result copied from Neon', () => {
    expect(invitationTokenFromText(JSON.stringify([{ setup_link: link }]))).toBe(token);
  });
  it('accepts a raw token and encoded case', () => {
    expect(invitationTokenFromText('  ' + token.toUpperCase() + '  ')).toBe(token);
  });
  it('rejects missing, partial, or malformed invitations', () => {
    for (const value of ['', 'https://sterlynsupplies.netlify.app/owner-setup', link.slice(0, -1), '#token=' + 'a'.repeat(65)]) {
      expect(invitationTokenFromText(value)).toBe('');
    }
  });
});
