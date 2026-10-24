#!/usr/bin/env python3
# IMPORT FASE 2 (24/10/2026) — legge il foglio Google via export XLSX.
# Uso: python3 import-fase2.py [--simula COGNOME1,COGNOME2] [--genera]
# NON tocca il database: genera SQL da verificare. Origine: "Copia di DB ANAGRAFICA PERSONALE".
# Fogli: DOCUMENTI, MEDICA, VACCINI (copertura), VACCINAZIONI (storico),
#        RILEVAZIONE TAGLIE, ANAGRAFICA CANI, VACCINAZIONI CANI.
# Aggancio per CODICE FISCALE (come FASE 1). Le celle vuote restano vuote (null).

import sys, io, re, urllib.request, openpyxl

SHEET = '16iY_urOb3pyzM2sXtDRLHK0aEt73Rcd3MtgJW9L_8DQ'

def pulisci(x):
    if isinstance(x, float) and x == int(x):
        return str(int(x))
    return ' '.join(str(x or '').split()).strip()

def data_iso(x):
    import datetime
    if isinstance(x, (datetime.datetime, datetime.date)):
        return x.strftime('%Y-%m-%d')
    s = pulisci(x)
    if '/' in s:
        p = s.split('/')
        if len(p) == 3 and len(p[2]) == 4:
            g, m, a = int(p[0]), int(p[1]), p[2]
            if m > 12: return None
            return f"{a}-{m:02d}-{g:02d}"
    return None

def q(v):
    """valore SQL: null se vuoto, testo tra apici raddoppiati"""
    if v is None or v == '': return 'null'
    return "'" + str(v).replace("'", "''") + "'"

def scarica():
    url = f'https://docs.google.com/spreadsheets/d/{SHEET}/export?format=xlsx'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return openpyxl.load_workbook(io.BytesIO(urllib.request.urlopen(req).read()))

# ---- mappa CF -> uuid profilo (dal DB: passata come file generato da query, o costruita da FASE1-import.sql) ----
def carica_mappa(repo_dir='.'):
    """costruisce CF -> (id, cognome, nome) leggendo db/FASE1-import.sql"""
    import csv
    mappa = {}
    s = open(f'{repo_dir}/db/FASE1-import.sql', encoding='utf-8').read()
    vals = re.findall(r"values \('(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',\s*'(.*?)',", s)
    for (idv, email, nome, cognome, cf) in vals:
        mappa.setdefault(cf.upper(), (idv, cognome, nome))
    return mappa

def main():
    simula = None
    genera = '--genera' in sys.argv
    if '--simula' in sys.argv:
        simula = [x.strip().upper() for x in sys.argv[sys.argv.index('--simula') + 1].split(',')]

    wb = scarica()
    mappa = carica_mappa()
    print(f"Mappa profili FASE 1: {len(mappa)} codici fiscali")

    # helper: trova uuid per riga (col CF in pos 2 per quasi tutti i fogli)
    def uuid_di(r, col_cf=2):
        cf = pulisci(r[col_cf]).upper()
        if cf in mappa: return mappa[cf][0], mappa[cf][1], mappa[cf][2], cf
        return None, None, None, cf

    non_trovati = set()
    sql = []
    stats = {}

    def aggiungi(nome_sezione, righe_sql, n_dati, n_agganciati):
        stats[nome_sezione] = (n_dati, n_agganciati)
        sql.extend(righe_sql)

    # ============ DOCUMENTI ============
    ws = wb['DOCUMENTI']
    righe, agg, agg_c = [], 0, 0
    for r in ws.iter_rows(min_row=4, max_col=20, values_only=True):
        if not r[2]: continue
        righe.append(r); agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        sql.append(f"-- {pulisci(r[3])} {pulisci(r[4])}")
        sql.append(
            f"insert into documenti (operatore_id, patente_civile_cat, patente_civile_scadenza, patente_min_cat, patente_min_scadenza, "
            f"patente_nautica_cat, patente_nautica_scadenza, carta_identita_num, carta_identita_scadenza, tessera_ate_num, tessera_ate_scadenza, "
            f"passaporto_civile_num, passaporto_civile_scadenza, passaporto_min_num, passaporto_min_scadenza) values ("
            f"'{uid}', {q(pulisci(r[5]))}, {q(data_iso(r[6]))}, {q(pulisci(r[7]))}, {q(data_iso(r[8]))}, "
            f"{q(pulisci(r[9]))}, {q(data_iso(r[10]))}, {q(pulisci(r[12]))}, {q(data_iso(r[13]))}, "
            f"{q(pulisci(r[14]))}, {q(data_iso(r[15]))}, {q(pulisci(r[16]))}, {q(data_iso(r[17]))}, "
            f"{q(pulisci(r[18]))}, {q(data_iso(r[19]))}) "
            f"on conflict (operatore_id) do update set patente_civile_cat=excluded.patente_civile_cat, "
            f"patente_civile_scadenza=excluded.patente_civile_scadenza, patente_min_cat=excluded.patente_min_cat, "
            f"patente_min_scadenza=excluded.patente_min_scadenza, patente_nautica_cat=excluded.patente_nautica_cat, "
            f"patente_nautica_scadenza=excluded.patente_nautica_scadenza, carta_identita_num=excluded.carta_identita_num, "
            f"carta_identita_scadenza=excluded.carta_identita_scadenza, tessera_ate_num=excluded.tessera_ate_num, "
            f"tessera_ate_scadenza=excluded.tessera_ate_scadenza, passaporto_civile_num=excluded.passaporto_civile_num, "
            f"passaporto_civile_scadenza=excluded.passaporto_civile_scadenza, passaporto_min_num=excluded.passaporto_min_num, "
            f"passaporto_min_scadenza=excluded.passaporto_min_scadenza;"
        )
    aggiungi('DOCUMENTI', [], agg, agg_c)

    # ============ MEDICA ============
    ws = wb['MEDICA']
    agg, agg_c = 0, 0
    for r in ws.iter_rows(min_row=4, max_col=14, values_only=True):
        if not r[2]: continue
        agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        sql.append(f"-- {pulisci(r[3])} {pulisci(r[4])}")
        sql.append(
            f"insert into scheda_medica (operatore_id, medico_base, medico_telefono, intolleranze, alimentazione, allergie, problemi_medici) values ("
            f"'{uid}', {q(pulisci(r[5]))}, {q(pulisci(r[6]))}, {q(pulisci(r[7]))}, {q(pulisci(r[8]))}, "
            f"{q(pulisci(r[10]))}, {q(pulisci(r[11]))}) "
            f"on conflict (operatore_id) do update set medico_base=excluded.medico_base, medico_telefono=excluded.medico_telefono, "
            f"intolleranze=excluded.intolleranze, alimentazione=excluded.alimentazione, allergie=excluded.allergie, problemi_medici=excluded.problemi_medici;"
        )
    stats['MEDICA'] = (agg, agg_c)

    # ============ VACCINI (scheda di copertura) ============
    # struttura: col6 ANTIEPATITE A (flag+date col7,8), col9 ANTIEPATITE B (col10,11,12),
    # poi coppie vaccino/ultima somministrazione: col13/14, 15/16, 17/18, 19/20, 21/22, 23/24, 25/26, 27/28, 29/30
    SCADENZE = {13: 2, 15: 10, 17: 10, 19: 10, 21: None, 23: 5, 25: None, 27: 2, 29: 1}
    ws = wb['VACCINI']
    agg, agg_c = 0, 0
    for r in ws.iter_rows(min_row=4, max_col=30, values_only=True):
        if not r[2]: continue
        agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        nome_p = pulisci(r[3]) + ' ' + pulisci(r[4])
        righe_p = []
        # epatite A: date in col 7 (prima) e 8 (seconda) -> ultima = max
        dA = [data_iso(r[6]), data_iso(r[7])]
        dA = [d for d in dA if d]
        if dA:
            righe_p.append(('ANTIEPATITE A', max(dA), None))
        # epatite B: col 10,11,12
        dB = [data_iso(x) for x in (r[9], r[10], r[11])]
        dB = [d for d in dB if d]
        if dB:
            righe_p.append(('ANTIEPATITE B', max(dB), None))
        # coppie successive
        for col_vacc in (13, 15, 17, 19, 21, 23, 25, 27, 29):
            hdr = ws.cell(row=3, column=col_vacc).value
            if not hdr: continue
            vaccino = pulisci(hdr)
            idx_data = col_vacc  # 0-based: col_vacc e' il flag, col_vacc+1 la data
            idx_data = col_vacc  # indice 0-based della colonna FLAG; DATA = flag+1
            data_u = data_iso(r[col_vacc]) if col_vacc < len(r) else None
            # struttura foglio: col N = flag vaccino, col N+1 = data ultima somministrazione
            data_u = data_iso(r[col_vacc + 1]) if (col_vacc + 1) < len(r) else None
            flag = r[col_vacc] if col_vacc < len(r) else None
            if flag in (True, 'True', 'SI', 'Vero', 'TRUE') or data_u:
                righe_p.append((vaccino, data_u, SCADENZE.get(col_vacc)))
        sql.append(f"-- copertura {nome_p}")
        for (v, d, sc) in righe_p:
            sql.append(f"insert into vaccini_copertura (operatore_id, vaccino, data_somministrazione, scadenza_anni) values ('{uid}', {q(v)}, {q(d)}, {q(sc)}) on conflict (operatore_id, vaccino) do update set data_somministrazione=excluded.data_somministrazione, scadenza_anni=excluded.scadenza_anni;")
    stats['VACCINI (copertura)'] = (agg, agg_c)

    # ============ VACCINAZIONI (storico) ============
    ws = wb['VACCINAZIONI']
    agg, agg_c = 0, 0
    for r in ws.iter_rows(min_row=4, max_col=8, values_only=True):
        if not r[2]: continue
        agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        idv = pulisci(r[0])
        sql.append(
            f"insert into vaccini_storico (id, operatore_id, tipo_vaccino, data_somministrazione, scadenza) values ("
            f"{q(idv)}, '{uid}', {q(pulisci(r[5]))}, {q(data_iso(r[6]))}, {q(data_iso(r[7]))}) "
            f"on conflict (id) do update set tipo_vaccino=excluded.tipo_vaccino, data_somministrazione=excluded.data_somministrazione, scadenza=excluded.scadenza;"
        )
    stats['VACCINAZIONI (storico)'] = (agg, agg_c)

    # ============ RILEVAZIONE TAGLIE ============
    ws = wb['RILEVAZIONE TAGLIE']
    agg, agg_c = 0, 0
    for r in ws.iter_rows(min_row=4, max_col=10, values_only=True):
        if not r[2]: continue
        agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        sql.append(f"-- {pulisci(r[3])} {pulisci(r[4])}")
        sql.append(
            f"insert into taglie_dpi (operatore_id, tuta, elmo, intimo_termico, scarponi, guanti) values ("
            f"'{uid}', {q(pulisci(r[5]))}, {q(pulisci(r[6]))}, {q(pulisci(r[7]))}, {q(pulisci(r[8]))}, {q(pulisci(r[9]))}) "
            f"on conflict (operatore_id) do update set tuta=excluded.tuta, elmo=excluded.elmo, intimo_termico=excluded.intimo_termico, scarponi=excluded.scarponi, guanti=excluded.guanti;"
        )
    stats['RILEVAZIONE TAGLIE'] = (agg, agg_c)

    # ============ ANAGRAFICA CANI ============
    ws = wb['ANAGRAFICA CANI']
    agg, agg_c = 0, 0
    for r in ws.iter_rows(min_row=4, max_col=13, values_only=True):
        if not r[2]: continue
        agg += 1
        uid, cog, nom, cf = uuid_di(r)
        if not uid: non_trovati.add((cf, pulisci(r[3]))); continue
        agg_c += 1
        idc = pulisci(r[0])
        sql.append(f"-- {pulisci(r[3])} {pulisci(r[4])}: {pulisci(r[5])}")
        sql.append(
            f"insert into cani (id, operatore_id, nome, razza, sesso, data_nascita, colore, microchip, microchip_data, microchip_localita) values ("
            f"{q(idc)}, '{uid}', {q(pulisci(r[5]))}, {q(pulisci(r[6]))}, {q(pulisci(r[7]))}, {q(data_iso(r[8]))}, "
            f"{q(pulisci(r[9]))}, {q(pulisci(r[10]))}, {q(data_iso(r[11]))}, {q(pulisci(r[12]))}) "
            f"on conflict (id) do update set nome=excluded.nome, razza=excluded.razza, sesso=excluded.sesso, data_nascita=excluded.data_nascita, "
            f"colore=excluded.colore, microchip=excluded.microchip, microchip_data=excluded.microchip_data, microchip_localita=excluded.microchip_localita;"
        )
    stats['ANAGRAFICA CANI'] = (agg, agg_c)

    # ============ VACCINAZIONI CANI (aggancio per microchip: col 3) ============
    ws = wb['VACCINAZIONI CANI']
    agg, agg_c = 0, 0
    mic2cane = {}
    # mappa microchip -> id cane (dal foglio ANAGRAFICA CANI, col 11)
    wsA = wb['ANAGRAFICA CANI']
    for r in wsA.iter_rows(min_row=4, max_col=11, values_only=True):
        if r[2] and r[10]:
            mic2cane[pulisci(r[10])] = pulisci(r[0])
    for r in ws.iter_rows(min_row=4, max_col=7, values_only=True):
        if not r[1]: continue
        agg += 1
        idc = pulisci(r[0])
        mic = pulisci(r[3])
        cane_id = mic2cane.get(mic)
        if not cane_id:
            # fallback: id direct
            cane_id = pulisci(r[1]) if pulisci(r[1]) in mic2cane.values() else None
        if not cane_id:
            non_trovati.add(('CANE?', f"vaccino {idc} mic {mic}"))
            continue
        agg_c += 1
        sql.append(
            f"insert into cani_vaccini (id, cane_id, tipo_vaccino, data_somministrazione, scadenza) values ("
            f"{q(idc)}, {q(cane_id)}, {q(pulisci(r[4]))}, {q(data_iso(r[5]))}, {q(data_iso(r[6]))}) "
            f"on conflict (id) do update set tipo_vaccino=excluded.tipo_vaccino, data_somministrazione=excluded.data_somministrazione, scadenza=excluded.scadenza;"
        )
    stats['VACCINAZIONI CANI'] = (agg, agg_c)

    # ============ REPORT ============
    print("\n===== RIEPILOGO IMPORT FASE 2 =====")
    for k, (n, a) in stats.items():
        print(f"  {k:28s} righe: {n:4d}  agganciate: {a:4d}")
    if non_trovati:
        print(f"\n  CF NON TROVATI nei profili ({len(non_trovati)}):")
        for cf, cog in sorted(non_trovati)[:15]:
            print(f"    {cog:30s} CF: {cf}")
    else:
        print("\n  Tutte le righe agganciate.")

    if genera:
        with open('db/FASE2-import.sql', 'w', encoding='utf-8') as f:
            f.write("-- ================================================================\n")
            f.write("-- IMPORT FASE 2 — generato il " + __import__('datetime').datetime.now().strftime('%Y-%m-%d') + " da import-fase2.py\n")
            f.write("-- ESEGUIRE dopo db/FASE2-migrazione-schema.sql (SQL Editor, idempotente)\n")
            f.write("-- Backup raccomandato prima dell'esecuzione\n")
            f.write("-- ================================================================\n\nbegin;\n\n")
            f.write('\n'.join(sql))
            f.write("\n\ncommit;\n")
        print(f"\nSQL scritto in db/FASE2-import.sql ({len(sql)} righe)")

if __name__ == '__main__':
    main()
