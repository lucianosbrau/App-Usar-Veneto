-- FUNZIONE DI COLLEGAMENTO SCHEDA IMPORTATA (opzione A)
-- Alla registrazione: se l'email corrisponde a una scheda "in attesa" (importata),
-- l'account nuovo ne prende il posto: tutti i dati collegati (mantenimenti,
-- specializzazioni, ferie, squadre) vengono trasferiti al nuovo id.
-- Eseguire PRIMA di FASE1-import.sql (o subito dopo la migrazione FASE1).

create or replace function collega_scheda_importata(profilo_vecchio uuid, utente_nuovo uuid) returns void as $$
begin
  -- trasferisce i dati collegati
  update mantenimenti set operatore_id = utente_nuovo where operatore_id = profilo_vecchio;
  update operatori_specializzazioni set operatore_id = utente_nuovo where operatore_id = profilo_vecchio;
  update disponibilita set operatore_id = utente_nuovo where operatore_id = profilo_vecchio;
  update programmi_membri set operatore_id = utente_nuovo where operatore_id = profilo_vecchio;
  update risposte_attivazione set operatore_id = utente_nuovo where operatore_id = profilo_vecchio;
  -- copia i dati della scheda sulla riga dell'account nuovo (che caricaUtente ha già creato vuota)
  update profili p set
    nome = v.nome, cognome = v.cognome, codice_fiscale = v.codice_fiscale,
    data_nascita = v.data_nascita, luogo_nascita = v.luogo_nascita,
    cellulare = v.cellulare, telefono = v.telefono, email_servizio = v.email_servizio,
    grado = v.grado, comando = v.comando, sede = v.sede, turno = v.turno, salto_turno = v.salto_turno,
    corso_usar = v.corso_usar,
    contatto_ice_nome = v.contatto_ice_nome, contatto_ice_telefono = v.contatto_ice_telefono,
    contatto_ice_relazione = v.contatto_ice_relazione, medico_curante = v.medico_curante,
    gruppo_sanguigno = v.gruppo_sanguigno, indirizzo = v.indirizzo,
    patente = v.patente, estensioni_patente = v.estensioni_patente,
    missioni_int = v.missioni_int,
    sp_funzionario = v.sp_funzionario, sp_staff = v.sp_staff, sp_logista = v.sp_logista,
    sp_strutturista = v.sp_strutturista, sp_nbcr = v.sp_nbcr, sp_nbcr_est = v.sp_nbcr_est,
    sp_k9 = v.sp_k9, sp_saf = v.sp_saf, sp_sapr = v.sp_sapr,
    sp_medico = v.sp_medico, sp_infermiere = v.sp_infermiere, tas = v.tas
  from profili v
  where v.id = profilo_vecchio and p.id = utente_nuovo;
  -- elimina la scheda provvisoria
  delete from profili where id = profilo_vecchio;
end;
$$ language plpgsql security definer;

revoke all on function collega_scheda_importata(uuid, uuid) from public;
grant execute on function collega_scheda_importata(uuid, uuid) to authenticated;
