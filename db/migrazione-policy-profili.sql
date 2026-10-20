create policy "nuovo utente crea proprio profilo" on profili for insert
  with check (auth.uid() = id);
