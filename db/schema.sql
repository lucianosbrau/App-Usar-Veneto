-- Schema database USAR Veneto (PostgreSQL / Supabase)
-- Da eseguire nella SQL Editor di Supabase al primo setup.

create table profili (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  cognome text,
  email text,
  telefono text,
  ruolo text not null default 'operatore' check (ruolo in ('operatore', 'admin')),
  team text check (team in ('alpha', 'bravo', null)),
  telegram_chat_id bigint,
  created_at timestamptz not null default now()
);

create table specializzazioni (
  id serial primary key,
  nome text not null unique,
  icona text,
  obbligatoria_modulo boolean not null default false
);

insert into specializzazioni (nome, icona, obbligatoria_modulo) values
  ('Strutturista', '🏗️', true),
  ('NBCR 3° livello', '☣️', true),
  ('Unità cinofila K9', '🐕', true),
  ('Caposquadra/Capireparto', '⛑️', true),
  ('SAF 2A (corda)', '🧗', true);

create table operatori_specializzazioni (
  operatore_id uuid references profili(id) on delete cascade,
  specializzazione_id int references specializzazioni(id) on delete cascade,
  primary key (operatore_id, specializzazione_id)
);

create table disponibilita (
  id serial primary key,
  operatore_id uuid not null references profili(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('disponibile', 'ferie', 'indisponibile'))
);

create table attivazioni (
  id serial primary key,
  team text not null check (team in ('alpha', 'bravo')),
  messaggio text not null,
  creata_da uuid references profili(id),
  creata_il timestamptz not null default now(),
  chiusa boolean not null default false
);

create table risposte_attivazione (
  id serial primary key,
  attivazione_id int not null references attivazioni(id) on delete cascade,
  operatore_id uuid not null references profili(id) on delete cascade,
  risposta text not null check (risposta in ('si', 'no')),
  risposto_il timestamptz not null default now(),
  unique (attivazione_id, operatore_id)
);

create table mantenimenti (
  id serial primary key,
  operatore_id uuid not null references profili(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('Mantenimento', 'Manovra', 'Intervento', 'Lavorazione', 'Tutor Mantenimento', 'Tutor Corso', 'Altra formazione')),
  argomento text not null,
  ore numeric(4,1) not null check (ore > 0),
  stato text not null default 'in_validazione' check (stato in ('in_validazione', 'approvato', 'rifiutato')),
  validato_da uuid references profili(id),
  validato_il timestamptz,
  note_rifiuto text,
  inserito_il timestamptz not null default now()
);

create table impostazioni (
  chiave text primary key,
  valore text not null,
  aggiornato_il timestamptz not null default now()
);

insert into impostazioni (chiave, valore) values ('soglia_ore_mantenimenti', '36');

create table manifesti (
  id serial primary key,
  attivazione_id int references attivazioni(id),
  team text not null,
  mese text,
  pdf_url text,
  creato_il timestamptz not null default now()
);

alter table profili enable row level security;
alter table specializzazioni enable row level security;
alter table operatori_specializzazioni enable row level security;
alter table disponibilita enable row level security;
alter table attivazioni enable row level security;
alter table risposte_attivazione enable row level security;
alter table mantenimenti enable row level security;
alter table manifesti enable row level security;
alter table impostazioni enable row level security;

create policy "lettura impostazioni" on impostazioni for select using (true);
create policy "admin modifica impostazioni" on impostazioni for update
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

create policy "lettura profili" on profili for select using (true);
create policy "proprio profilo" on profili for update using (auth.uid() = id);
create policy "nuovo utente crea proprio profilo" on profili for insert
  with check (auth.uid() = id);
create policy "admin gestisce profili" on profili for update
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

create policy "lettura dati operativi" on specializzazioni for select using (true);
create policy "lettura os" on operatori_specializzazioni for select using (true);
create policy "lettura disp" on disponibilita for select using (true);

create policy "admin crea attivazioni" on attivazioni for insert with check (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

create policy "lettura risposte" on risposte_attivazione for select using (true);
create policy "propria risposta" on risposte_attivazione for insert
  with check (operatore_id = auth.uid());

create policy "lettura mantenimenti" on mantenimenti for select using (true);
create policy "operatore cancella propri in validazione" on mantenimenti for delete
  using (operatore_id = auth.uid() and stato = 'in_validazione');
create policy "operatore inserisce propri" on mantenimenti for insert
  with check (operatore_id = auth.uid());
create policy "operatore modifica propri" on mantenimenti for update
  using (operatore_id = auth.uid());
create policy "admin valida mantenimenti" on mantenimenti for update
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
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
