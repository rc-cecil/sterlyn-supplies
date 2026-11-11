import { describe, expect, it } from 'vitest';
import { invitationStatusFromText, invitationTokenFromText } from '../src/lib/owner-invitation';

const token = 'ab12cd34'.repeat(8);
const link = `https://sterlynsupplies.netlify.app/owner-setup#token=${token}`;

describe('one-time owner invitation parsing', () => {
  it('accepts complete raw tokens and full URLs', () => {
    expect(invitationTokenFromText(token)).toBe(token);
    expect(invitationTokenFromText(link)).toBe(token);
  });
  it('recognizes complete Neon SQL JSON results', () => {
    expect(invitationTokenFromText(JSON.stringify([{ setup_link: link }]))).toBe(token);
  });
  it('handles URL-encoded links pasted from mobile', () => {
    expect(invitationTokenFromText(encodeURIComponent(link))).toBe(token);
  });
  it('reports partial token length without revealing the contents', () => {
    const status = invitationStatusFromText(link.slice(0,-32));
    expect(status.token).toBe('');
    expect(status.detectedCharacters).toBe(32);
  });
  it('does not accept missing or overlong tokens', () => {
    for (const input of ['', 'https://sterlynsupplies.netlify.app/owner-setup',
      '#token='+'a'.repeat(65), '#token='+'a'.repeat(63)]) {
      expect(invitationTokenFromText(input)).toBe('');
    }
  });
});
