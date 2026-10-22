-- Seed: popola i nuovi campi anagrafici degli operatori di prova con valori casuali
-- Eseguire DOPO migrazione-anagrafica-estesa.sql. Sostituibile coi dati reali dal Google Sheet.

-- cellulare
update profili set cellulare = '3' || lpad((random() * 9)::int::text, 1, '0')
  || lpad((random() * 10000000)::int::text, 7, '0')
where email like 'prova.%' and cellulare is null;

-- indirizzo (via casuale + città del comando)
update profili p set indirizzo = 'Via ' || (array['Roma','Garibaldi','Cavour','Mazzini','Verdi','Marconi','Ferrari','Rossi','Manzoni','Leopardi','Foscolo','Carducci','Pascoli','Petrarca','Tasso','Ariosto','Alighieri','Boccaccio'])[1 + floor(random() * 18)]
  || ' ' || (10 + floor(random() * 90))::int || ', ' || coalesce(p.comando, 'Venezia')
where email like 'prova.%' and indirizzo is null;

-- ICE: nome casuale + telefono + relazione
update profili p set
  contatto_ice_nome = (array['Maria','Anna','Giuseppe','Luca','Paola','Elena','Marco','Sara','Davide','Chiara','Francesco','Giulia'])[1 + floor(random() * 12)] || ' ' || p.cognome,
  contatto_ice_relazione = (array['Coniuge','Figlio/a','Genitore','Fratello/Sorella'])[1 + floor(random() * 4)],
  contatto_ice_telefono = '3' || lpad((random() * 9)::int::text, 1, '0')
    || lpad((random() * 10000000)::int::text, 7, '0')
where email like 'prova.%' and contatto_ice_nome is null;

-- medico curante
update profili p set medico_curante = 'Dott. ' || (array['Bianchi','Rossi','Verdi','Neri','Bruni','Gallo','Costa','Fontana','Serra','Vitale','Moretti','Longo'])[1 + floor(random() * 12)]
where email like 'prova.%' and medico_curante is null;

-- gruppo sanguigno
update profili set gruppo_sanguigno = (array['0-','0+','A-','A+','B-','B+','AB-','AB+'])[1 + floor(random() * 8)]
where email like 'prova.%' and gruppo_sanguigno is null;
