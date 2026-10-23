-- Soglia mantenimenti: da 36 a 24 ore annue (decisione utente 23/10/2026)
update impostazioni set valore = '24' where chiave = 'soglia_ore_mantenimenti';
