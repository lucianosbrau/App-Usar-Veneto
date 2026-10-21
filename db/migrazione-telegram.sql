-- Migrazione: bot Telegram (collegamento account e ferie)
-- Eseguire nella SQL Editor di Supabase.

create table if not exists codici_telegram (
  id serial primary key,
  operatore_id uuid not null references profili(id) on delete cascade,
  codice text not null,
  scade_il timestamptz not null,
  usato boolean not null default false,
  created_at timestamptz not null default now()
);

alter table codici_telegram enable row level security;

create policy "proprio codice leggibile" on codici_telegram for select
  using (operatore_id = auth.uid());
create policy "proprio codice creato" on codici_telegram for insert
  with check (operatore_id = auth.uid());

-- Chat id Telegram sul profilo (già presente come telegram_chat_id)
create index if not exists idx_codici_telegram_codice on codici_telegram (codice);
