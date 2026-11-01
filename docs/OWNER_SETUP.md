# Owner setup and recovery

Configure `OWNER_EMAIL` and a unique `OWNER_PASSWORD` of 16–128 characters privately in the process environment, then run `pnpm setup:owner`. Do not put credentials in command arguments, tickets, screenshots or Git. Check status without exposing values with `pnpm setup:owner --status`.

Bootstrap uses Better Auth password hashing and a PostgreSQL transaction-scoped advisory lock. It refuses to overwrite an existing account or create a second owner. The initial email is trusted because the operator controls this private CLI operation. Do not rerun bootstrap to recover an existing owner.

Sign in at `/account` using the configured password. Administration requires an authenticated, unsuspended account with the relevant database role. Authenticator enrollment is not required. Historical authenticator records are preserved but do not gate the current password-based administration workflow. The former `LOCAL_ADMIN_SKIP_MFA` option is unnecessary; it must not be treated as an authentication bypass.

Use the password-reset flow with the existing configured email address to recover access. Reset links expire, are single use, and revoke existing sessions. Staff can use Sign out other sessions from their profile. Owner privileges cannot be removed through invitations or staff access controls. If email recovery is unavailable, establish an authorized operator recovery procedure before changing credentials; do not edit authentication records casually.

Invitations expire in 48 hours, bind to the verified recipient email, and can be accepted once. Replacements revoke outstanding invitations. Role changes and suspension invalidate sessions. Without SMTP, invitations remain queued and are not claimed as delivered.

Only owner/admin can confirm or reverse external receipts. Sales can manage enquiries and orders; fulfilment has no financial DTO access. Existing catalogue, content, audit and retention permissions remain scoped. See [showroom operations](SHOWROOM_OPERATIONS.md) for deployment and tracking-key requirements.
