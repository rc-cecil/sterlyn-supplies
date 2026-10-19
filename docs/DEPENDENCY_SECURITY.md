# Dependency security review — 18 October 2026

Nodemailer was upgraded to 10.1.6 and Vitest to 4.1.11, with lockfile updates. The production dependency audit reports zero advisories. All 31 unit/PostgreSQL checks pass under the patched runner; actual Mailpit SMTP capture passes with the patched mail library. Production SMTP requires TLS; the local capture exception is explicitly restricted to local demo hosts.

The full development dependency audit still reports one high advisory: braces 3.0.3, via eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch. The [reviewed upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched release. It describes stack exhaustion from deeply nested brace patterns. This is a lint-tool dependency; no storefront/API endpoint accepts brace patterns or invokes ESLint on uploaded content.

Do not suppress this finding or describe the full dependency graph as clean. Run lint/build only on trusted project sources, never on uploaded files or attacker-supplied patterns. The current shared demo image retains development tools, so runtime-image slimming and an explicit review of this finding remain release review items. A separate production-only dependency audit is enforced in CI; it is not a substitute for the full tooling audit. Recheck upstream before deployment and replace/update the lint dependency chain when a supported fix exists. No unsupported version override or unverified vendor patch has been applied.

Registry results are retained in out/release-evidence/dependency-audit-summary.json. They are a point-in-time advisory check, not a penetration test or a guarantee of security.
