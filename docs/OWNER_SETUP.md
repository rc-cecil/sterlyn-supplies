# Owner setup and recovery

On 18 October 2026, the development database reported no owner and no configured owner credentials. No production or development owner was created by the agent. Test-only owners were created and removed in sterlyn_test and the protected Docker demo media fixture. Final Docker status reports ownerExists:false and credentialsConfigured:false.

Configure OWNER_EMAIL and a unique OWNER_PASSWORD of 16–128 characters privately in the process environment, then run `pnpm setup:owner`. Do not put credentials in command arguments, tickets, screenshots or Git. Check status without exposing values with `pnpm setup:owner --status`.

Bootstrap uses Better Auth password hashing and a PostgreSQL transaction-scoped advisory lock, preventing concurrent duplicate bootstrap. It refuses to overwrite an existing account. The initial email is trusted because the operator controls this private CLI operation.

Sign in, enroll an authenticator, verify its code and save recovery codes privately. Administrative services check the current database role, suspension status and verified authenticator enrollment. Use a recovery code at the second-factor challenge if the authenticator is unavailable. The account security form can replace recovery codes after checking the current password; old codes stop working. Save new codes privately and use Hide recovery codes afterwards. Enabling MFA revokes pre-enrollment sessions. Owner privileges cannot be removed through staff invitations or staff access controls.

Invitations expire in 48 hours, bind to the verified recipient email, and can be accepted once. Issuing a replacement revokes existing outstanding invitations. Role changes and suspension invalidate sessions. Without SMTP, invitations remain queued and are not claimed as delivered.

A real owner login/MFA journey remains unverified until credentials are privately configured. Never bypass MFA by editing database flags. If all recovery codes are lost, stop and establish an authorized operator recovery procedure before altering credentials.

## Optional loopback-only admin testing

At the operator's explicit request, an unenrolled local administrator may test the dashboard with password sign-in before authenticator enrollment. Start the native preview with `LOCAL_ADMIN_SKIP_MFA=true`, `PUBLIC_LAUNCH=false`, `HOSTNAME=127.0.0.1`, an HTTP localhost `BETTER_AUTH_URL`, and the loopback `/sterlyn` database. All conditions must match; otherwise normal verified MFA is required. This setting is server-only, omitted from Docker/production configuration, and must not be added to deployment secrets. The dashboard displays a testing notice. Existing enrolled MFA is never disabled, sessions still require password authentication, suspension and role checks still apply, and stored MFA flags/secrets remain unchanged. Scheduled publication execution retains its verified-MFA publisher requirement.

To restore mandatory enrollment, stop the preview and restart without `LOCAL_ADMIN_SKIP_MFA`. The native localhost preview was started with this temporary option on 18 October 2026 at the account holder's request.
