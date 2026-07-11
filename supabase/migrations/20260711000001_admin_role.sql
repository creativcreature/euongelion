-- Admin role on the user row (custom-generation brief §9, F-077).
--
-- Real gating, not obscurity: the role lives in the database, is set
-- MANUALLY by the founder (no UI or API path can grant it), and every
-- admin endpoint verifies it server-side on each call — non-admins
-- receive 404, indistinguishable from a missing route. This is
-- independent of (and in addition to) the ADMIN_EMAIL_ALLOWLIST env
-- used by the existing admin pages.
--
-- Grant (founder, SQL editor only):
--   UPDATE public.users SET role = 'admin' WHERE email = '<founder email>';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.users.role IS
  'Server-side authorization role. Granted manually in the DB only — no UI/API path may write it. Checked per-request; non-admins get 404.';
