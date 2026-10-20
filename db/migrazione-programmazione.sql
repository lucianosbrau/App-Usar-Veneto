-- Migrazione: Programmazione mensile squadre Alpha/Bravo
-- Eseguire nella SQL Editor di Supabase.

-- Patenti di guida dell'operatore (per conteggio autisti)
alter table profili add column if not exists patente text;

-- Manifesto programmato: un record per ogni squadra per ogni mese
create table if not exists programmi_mensili (
  id serial primary key,
  mese date not null,                -- primo giorno del mese di riferimento
  team text not null check (team in ('alpha', 'bravo')),
  pubblicato boolean not null default false,
  creato_il timestamptz not null default now(),
  unique (mese, team)
);

-- Dettaglio del manifesto programmato
create table if not exists programmi_membri (
  id serial primary key,
  programma_id int not null references programmi_mensili(id) on delete cascade,
  operatore_id uuid not null references profili(id) on delete cascade,
  ruolo text not null default 'generico'
    check (ruolo in ('generico', 'strutturista', 'nbcr', 'k9', 'caposquadra', 'saf')),
  inserito_il timestamptz not null default now(),
  unique (programma_id, operatore_id)
);

-- Requisiti numerici del modulo (modificabili dall'admin)
insert into impostazioni (chiave, valore) values
  ('modulo_totale', '38'),
  ('modulo_strutturisti', '2'),
  ('modulo_k9', '4')
on conflict (chiave) do nothing;

alter table programmi_mensili enable row level security;
alter table programmi_membri enable row level security;

create policy "lettura programmi" on programmi_mensili for select using (true);
create policy "lettura membri" on programmi_membri for select using (true);
create policy "admin scrive programmi" on programmi_mensili for all
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
create policy "admin scrive membri" on programmi_membri for all
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
