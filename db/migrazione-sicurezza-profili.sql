-- Migrazione: protezione del campo ruolo + privacy dei profili
-- Eseguire in SQL Editor (dopo schema.sql e migrazioni precedenti)

-- =====================================================================
-- 1) PROTEZIONE DEL RUOLO 'admin' (fix escalation di privilegio)
-- La policy "proprio profilo" (update using auth.uid() = id) non limita
-- le colonne: un operatore poteva aggiornare la PROPRIA riga impostando
-- ruolo='admin'. Questo trigger blocca la modifica di `ruolo` a meno che
-- a modificarla sia un admin diverso (o la service_role del bot/server).
-- =====================================================================

create or replace function proteggi_ruolo() returns trigger as $$
begin
  -- se il ruolo non cambia, tutto ok
  if new.ruolo = old.ruolo then
    return new;
  end if;
  -- service_role (bot) e service_user possono sempre
  if coalesce(current_setting('request.jwt.claims', true), '') like '%"role":"service_role"%' then
    return new;
  end if;
  -- un admin esistente puo' promuovere/revocare altri (ma non serve per se stesso: ruolo gia' admin)
  if exists (
    select 1 from profili p
    where p.id = auth.uid() and p.ruolo = 'admin'
  ) then
    return new;
  end if;
  raise exception 'Modifica del ruolo non consentita';
end;
$$ language plpgsql security definer;

drop trigger if exists trg_proteggi_ruolo on profili;
create trigger trg_proteggi_ruolo
  before update of ruolo on profili
  for each row execute function proteggi_ruolo();

-- =====================================================================
-- 2) PRIVACY DEI PROFILI: lettura solo per utenti autenticati
-- (prima: using(true) = chiunque con la chiave anon poteva leggere
--  l'elenco dei 50 account di prova — e leggera' i dati veri)
-- =====================================================================

drop policy if exists "lettura profili" on profili;
create policy "lettura profili" on profili for select
  using (auth.role() = 'authenticated');
