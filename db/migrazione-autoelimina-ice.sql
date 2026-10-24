-- Migrazione: auto-eliminazione account + consenso ICE
-- 24/10/2026 — da eseguire nel SQL Editor di Supabase (idempotente, sicura da rilanciare)

-- 1) l'utente puo' eliminare il PROPRIO account (l'admin resta l'unico a poter eliminare altri)
create or replace function elimina_operatore(target uuid) returns void as $$
declare
  richiedente_ruolo text;
  nominativo text;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;
  if auth.uid() <> target then
    -- elimina un ALTRO: serve essere admin
    select ruolo into richiedente_ruolo from profili where id = auth.uid();
    if coalesce(richiedente_ruolo, '') <> 'admin' then
      raise exception 'Solo un amministratore puo'' eliminare account altrui';
    end if;
  end if;
  select cognome || ' ' || nome into nominativo from profili where id = target;
  insert into log_admin (admin_id, azione, dettaglio)
  values (auth.uid(), 'elimina_account', coalesce(nominativo, target::text) ||
    case when auth.uid() = target then ' (auto-eliminazione)' else '' end);
  delete from auth.users where id = target;
end;
$$ language plpgsql security definer;

revoke all on function elimina_operatore(uuid) from public;
grant execute on function elimina_operatore(uuid) to authenticated;

-- 2) consenso ICE: l'utente dichiara di aver informato il proprio contatto ICE
alter table profili add column if not exists ice_consenso_il timestamptz;
