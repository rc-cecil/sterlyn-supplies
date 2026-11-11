/**
 * Parse a private owner invitation locally. Never log or expose the result.
 * Accepts a raw token, a full URL, or Neon's JSON result containing setup_link.
 */
export function invitationTokenFromText(value: string): string {
  const input = value.trim();
  if (/^[a-f0-9]{64}$/i.test(input)) return input.toLowerCase();
  const match = input.match(/[?#&]token=([a-f0-9]{64})(?![a-f0-9])/i);
  return match?.[1]?.toLowerCase() ?? '';
}
