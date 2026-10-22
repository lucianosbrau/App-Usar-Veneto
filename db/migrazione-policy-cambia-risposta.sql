-- Migrazione: l'operatore puo' cambiare la propria risposta a un'attivazione
-- (il pulsante "Cambia risposta" in pagina Attivazione cancella la riga e fa reinserire)
-- Eseguire in SQL Editor.

drop policy if exists "operatore cancella propria risposta" on risposte_attivazione;
create policy "operatore cancella propria risposta" on risposte_attivazione for delete
  using (operatore_id = auth.uid());
