-- Run after migrations with the private migration connection using psql.
-- Supply -v runtime_role=sterlyn_app (identifier only, never a password).
-- Create the LOGIN role and set its password privately before running this file.
-- Never run with the migration owner as runtime_role.
\set ON_ERROR_STOP on
SELECT current_user = :'runtime_role' OR EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tableowner=:'runtime_role') OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=:'runtime_role')) AS unsafe_runtime_role \gset
\if :unsafe_runtime_role
  \echo 'Refusing an owner or privileged runtime role.'
  \quit 1
\endif
BEGIN;
ALTER ROLE :"runtime_role" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_role";
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM :"runtime_role";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON _prisma_migrations FROM :"runtime_role";
-- pg-boss initializes and upgrades only its own schema under this restricted role.
CREATE SCHEMA IF NOT EXISTS pgboss AUTHORIZATION :"runtime_role";
GRANT USAGE, CREATE ON SCHEMA pgboss TO :"runtime_role";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgboss TO :"runtime_role";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pgboss TO :"runtime_role";
COMMIT;
