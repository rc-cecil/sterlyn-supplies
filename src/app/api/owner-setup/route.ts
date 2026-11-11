import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { bootstrapOwner } from '@/lib/owner-bootstrap';
import { limit } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const setupKey = 'ownerSetupInvitation';
const inputSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(16).max(128),
}).strict();

function respond(message: string, status: number) {
  return NextResponse.json({ message }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' },
  });
}

/** A single-use invitation delivered privately to the approved business owner. */
export async function POST(request: NextRequest) {
  const expectedOrigin = new URL(process.env.BETTER_AUTH_URL || request.url).origin;
  if (request.headers.get('origin') !== expectedOrigin) return respond('This request is not permitted.', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return respond('Invalid request.', 415);

  try {
    await limit(request, 'one-time-owner-onboarding', 5);
    const payload = await request.text();
    if (payload.length > 2048) return respond('Invalid request.', 413);
    const parsed = inputSchema.safeParse(JSON.parse(payload));
    if (!parsed.success) return respond('Check your invitation link and password requirements.', 400);
    const invitation = await db.setting.findUnique({ where: { key: setupKey } });
    const details = invitation?.value as { email?: unknown; tokenHash?: unknown; expiresAt?: unknown } | undefined;
    if (!details || typeof details.email !== 'string' || typeof details.tokenHash !== 'string' ||
        typeof details.expiresAt !== 'string' || !/^[a-f0-9]{64}$/i.test(details.tokenHash) ||
        Date.parse(details.expiresAt) <= Date.now()) {
      return respond('This setup invitation is invalid or has expired.', 403);
    }

    const digest = createHash('sha256').update(parsed.data.token, 'utf8').digest();
    const expected = Buffer.from(details.tokenHash, 'hex');
    if (expected.length !== digest.length || !timingSafeEqual(digest, expected)) {
      return respond('This setup invitation is invalid or has expired.', 403);
    }

    // Uses Better Auth password hashing, a transaction-scoped lock, and an append-only audit.
    await bootstrapOwner({ email: details.email, password: parsed.data.password });
    await db.setting.deleteMany({ where: { key: setupKey } });
    return NextResponse.json({ message: 'Owner account created successfully.' }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' },
    });
  } catch {
    // Never print the invitation, password, hash, or database connection details.
    return respond('Setup could not be completed. Please contact the site administrator.', 409);
  }
}
