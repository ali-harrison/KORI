-- ============================================================
-- KORI/GYM — Contract PDF storage
-- ============================================================
--
-- Private bucket for generated membership-agreement PDFs
-- (app/actions/contracts.ts:sendContract, lib/contract-pdf.tsx). Not
-- public — these are member PII/billing documents; retrieval goes
-- through short-lived signed URLs (getContractDownloadUrl), not a
-- permanent link. Path convention: {gym_id}/{contract_id}.pdf —
-- contracts.pdf_url stores that path, not a fetchable URL.

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- Mirrors the existing `contracts` table RLS policy exactly (gym owners
-- only, scoped via gyms.owner_id) — (storage.foldername(name))[1] is the
-- first path segment (the gym_id folder), cast to uuid since it comes
-- back as text and a bare comparison against the uuid subquery below
-- would silently never match.
create policy "Gym owners manage their own contract PDFs"
  on storage.objects for all
  using (
    bucket_id = 'contracts'
    and ((storage.foldername(name))[1])::uuid in (select id from gyms where owner_id = auth.uid())
  )
  with check (
    bucket_id = 'contracts'
    and ((storage.foldername(name))[1])::uuid in (select id from gyms where owner_id = auth.uid())
  );
