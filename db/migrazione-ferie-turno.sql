-- Migrazione: ferie per turno (giorno/notte) inseribili dal Calendario
-- Eseguire nella SQL Editor di Supabase.

alter table disponibilita add column if not exists turno_ferie text
  check (turno_ferie in ('giorno', 'notte'));

-- L'operatore può cancellare le proprie disponibilità/ferie
create policy "operatore cancella proprie disponibilita" on disponibilita for delete
  using (operatore_id = auth.uid());
