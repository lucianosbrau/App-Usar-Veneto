-- FIX FOTO PROFILO: bucket PRIVATO con URL firmati
-- L'upload da parte dell'utente falliva ("new row violates row-level security")
-- perche' in un bucket PUBBLICO Supabase accetta le scritture SOLO con la
-- service key, non con l'utente autenticato normale.
-- Soluzione: bucket privato + lettura consentita a tutti gli autenticati +
-- URL firmati (validi 1 ora) generati dall'app.
-- Eseguire in SQL Editor.

update storage.buckets set public = false where id = 'foto-profili';

drop policy if exists "foto lettura autenticati" on storage.objects;
create policy "foto lettura autenticati" on storage.objects for select
  using (bucket_id = 'foto-profili' and auth.role() = 'authenticated');

drop policy if exists "foto upload propria cartella" on storage.objects;
create policy "foto upload propria cartella" on storage.objects for insert
  with check (bucket_id = 'foto-profili' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "foto update propria cartella" on storage.objects;
create policy "foto update propria cartella" on storage.objects for update
  using (bucket_id = 'foto-profili' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "foto delete propria cartella" on storage.objects;
create policy "foto delete propria cartella" on storage.objects for delete
  using (bucket_id = 'foto-profili' and (storage.foldername(name))[1] = auth.uid()::text);
