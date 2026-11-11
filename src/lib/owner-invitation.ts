/**
 * Extracts one-time owner invitations on the client without displaying or logging secrets.
 * Supports raw tokens, full URLs, JSON query results, and URL-encoded links.
 * Only a complete 64-character hexadecimal token can enable owner enrollment.
 */
export type InvitationStatus = {
  token: string;
  detectedCharacters: number;
};

export function invitationStatusFromText(value: string): InvitationStatus {
  const original = value.trim();
  if (/^[a-f0-9]{64}$/i.test(original)) return { token: original.toLowerCase(), detectedCharacters: 64 };

  const candidates = [original];
  for (let index = 0; index < 2; index++) {
    const previous = candidates[candidates.length - 1];
    try {
      const decoded = decodeURIComponent(previous);
      if (decoded === previous) break;
      candidates.push(decoded);
    } catch {
      break;
    }
  }

  let detectedCharacters = 0;
  for (const input of candidates) {
    // Accept Neon SQL results with the full token after #token=, ?token=, or &token=.
    // Spaces/newlines may have been introduced by copying a formatted result.
    const marked = input.match(/(?:^|[?#&]|\b)token\s*=\s*([a-f0-9\s-]{1,128})/i);
    if (marked) {
      const compact = marked[1].replace(/[\s-]/g, '');
      detectedCharacters = Math.max(detectedCharacters, Math.min(compact.length, 64));
      if (/^[a-f0-9]{64}$/i.test(compact)) {
        return { token: compact.toLowerCase(), detectedCharacters: 64 };
      }
    }

    // A complete token can also be copied as its own cell without a URL marker.
    const standalone = input.match(/(?:^|[^a-f0-9])([a-f0-9]{64})(?![a-f0-9])/i);
    if (standalone) return { token: standalone[1].toLowerCase(), detectedCharacters: 64 };
  }

  return { token: '', detectedCharacters };
}

export function invitationTokenFromText(value: string): string {
  return invitationStatusFromText(value).token;
}
