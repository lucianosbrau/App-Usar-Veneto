-- FIX per errore import: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- L'import usa ON CONFLICT (email): serve il vincolo di unicità sull'email.
-- Eseguire QUESTO file PRIMA di rilanciare FASE1-import.sql.

-- 1) Verifica (sola lettura): mostra eventuali email duplicate
select email, count(*) as copie from profili group by email having count(*) > 1;

-- 2) Il vincolo di unicità (fallisce solo se il punto 1 ha mostrato duplicati)
create unique index if not exists profili_email_unici on profili (email);
