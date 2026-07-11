-- Explicit privileges for the data-API roles. Recent Supabase images no
-- longer grant DML on new tables by default; RLS (owner-only policies in the
-- initial schema) remains the real access control for `authenticated`.
-- `anon` intentionally gets nothing: every route requires a session.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
