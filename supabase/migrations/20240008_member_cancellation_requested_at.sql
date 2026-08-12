-- ============================================================
-- KORI/GYM — Member cancellation in-flight marker
-- ============================================================
--
-- Local "cancel member" used to write status = 'cancelled' directly,
-- without ever calling GoCardless — meaning the mandate could still be
-- live and collecting after the UI called someone "cancelled". The fix
-- (lib/member-cancellation.ts) now calls GoCardless first and lets the
-- existing mandates.cancelled webhook (handleMandateCancelled) remain the
-- only writer of the terminal state. This column marks the in-flight gap
-- between "we asked GoCardless to cancel" and "GoCardless confirmed it" —
-- getMandateBadgeState derives a transitional "cancelling" badge from it
-- rather than adding a new members.status enum value, so the existing
-- members_status_check CHECK constraint (20240005_hardening.sql) doesn't
-- need touching.
--
-- NULL means no cancellation is in flight. Cleared back to NULL by the
-- mandates.cancelled webhook once it writes the terminal paused/null-
-- mandate state, so it never lingers past confirmation.

alter table members
  add column if not exists cancellation_requested_at timestamptz;
