# Oracle production deployments

GitHub Actions verifies source changes before deploying.

The production job runs only for successful verification
on the main branch and requires approval from the protected
GitHub production environment.

Deployment uses the existing Oracle Compose project and
recreates only web and worker.

Database, object storage, antivirus, processor, volumes,
Caddy and production environment files are not recreated.

Deployments are blocked between 02:30 and 04:00 UTC.
The active backup service also blocks deployment.

Before approving deployment, the reviewer must verify
the latest completed local and encrypted offsite backup
using Sterlyn's existing backup verification procedure.

Database schema changes require a separate migration review.

If startup or readiness fails, the deployment script attempts
to restore the previous release override and containers.

Keep previous images for rollback. Do not run docker compose
down, volume removal, git reset or git clean during
routine releases.
