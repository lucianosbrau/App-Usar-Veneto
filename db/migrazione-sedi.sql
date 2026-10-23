-- Migrazione: COMANDI e SEDI ufficiali (24/10/2026, lista confermata dall'utente)
-- Tabella sedi: comando → nome sede. La tendina del Profilo sarà a cascata.
-- Eseguire in SQL Editor.

create table if not exists sedi (
  id serial primary key,
  comando text not null,
  sede text not null,
  unique (comando, sede)
);

delete from sedi;
insert into sedi (comando, sede) values
-- DIREZIONE
('DIREZIONE REGIONALE VENETO', 'Centrale Direzione'),
-- VENEZIA
('VENEZIA', 'Centrale Mestre'),
('VENEZIA', 'Chioggia'),
('VENEZIA', 'San Donà di Piave'),
('VENEZIA', 'Portogruaro'),
('VENEZIA', 'Mira'),
('VENEZIA', 'Venezia'),
('VENEZIA', 'Lido'),
('VENEZIA', 'Aeroporto Venezia'),
('VENEZIA', 'Cavarzere'),
('VENEZIA', 'Jesolo'),
-- PADOVA
('PADOVA', 'Centrale Padova'),
('PADOVA', 'Abano Terme'),
('PADOVA', 'Cittadella'),
('PADOVA', 'Este'),
('PADOVA', 'Piove di Sacco'),
-- TREVISO
('TREVISO', 'Centrale Treviso'),
('TREVISO', 'Castelfranco'),
('TREVISO', 'Conegliano'),
('TREVISO', 'Vittorio Veneto'),
('TREVISO', 'Montebelluna'),
('TREVISO', 'Motta di Livenza'),
('TREVISO', 'Aeroporto Treviso'),
-- VERONA
('VERONA', 'Centrale Verona'),
('VERONA', 'Caldiero'),
('VERONA', 'Bardolino sul Garda'),
('VERONA', 'Legnago'),
('VERONA', 'Aeroporto Verona'),
-- VICENZA
('VICENZA', 'Centrale Vicenza'),
('VICENZA', 'Asiago'),
('VICENZA', 'Bassano'),
('VICENZA', 'Schio'),
('VICENZA', 'Arzignano'),
('VICENZA', 'Lonigo'),
-- BELLUNO
('BELLUNO', 'Centrale Belluno'),
('BELLUNO', 'Feltre'),
('BELLUNO', 'Agordo'),
('BELLUNO', 'Pieve di Cadore'),
('BELLUNO', 'Cortina d''Ampezzo'),
('BELLUNO', 'Santo Stefano di Cadore'),
-- ROVIGO
('ROVIGO', 'Centrale Rovigo'),
('ROVIGO', 'Adria'),
('ROVIGO', 'Castelmassa'),
-- UDINE
('UDINE', 'Centrale Udine'),
('UDINE', 'Cervignano del Friuli'),
('UDINE', 'Latisana'),
('UDINE', 'Cividale del Friuli'),
('UDINE', 'Gemona del Friuli'),
('UDINE', 'Tarvisio'),
('UDINE', 'Tolmezzo'),
-- PORDENONE
('PORDENONE', 'Centrale Pordenone'),
('PORDENONE', 'San Vito al Tagliamento'),
('PORDENONE', 'Spilimbergo'),
('PORDENONE', 'Maniago'),
-- TRIESTE
('TRIESTE', 'Centrale Trieste'),
('TRIESTE', 'Opicina'),
('TRIESTE', 'Muggia'),
('TRIESTE', 'Trieste Porto'),
-- GORIZIA
('GORIZIA', 'Centrale Gorizia'),
('GORIZIA', 'Monfalcone'),
('GORIZIA', 'Aeroporto Ronchi dei Legionari');

alter table sedi enable row level security;
drop policy if exists "lettura sedi" on sedi;
create policy "lettura sedi" on sedi for select using (true);
