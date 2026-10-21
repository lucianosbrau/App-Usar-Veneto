-- Migrazione: membri del manifesto di attivazione
-- Eseguire in SQL Editor (dopo schema.sql e migrazioni precedenti)

create table if not exists manifesti_membri (
  id serial primary key,
  manifesto_id int not null references manifesti(id) on delete cascade,
  operatore_id uuid not null references profili(id) on delete cascade,
  posto int not null check (posto between 1 and 38),
  unique (manifesto_id, posto),
  unique (manifesto_id, operatore_id)
);

alter table manifesti_membri enable row level security;

-- chiunque autenticato può leggere la composizione del manifesto
create policy "lettura manifesti" on manifesti for select using (true);
create policy "lettura membri manifesto" on manifesti_membri for select using (true);

-- admin crea/compila il manifesto dell'attivazione
create policy "admin crea manifesti" on manifesti for insert with check (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
create policy "admin modifica manifesti" on manifesti for update using (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

create policy "admin inserisce membri" on manifesti_membri for insert with check (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
create policy "admin elimina membri" on manifesti_membri for delete using (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
