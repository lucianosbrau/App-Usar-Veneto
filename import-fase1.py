#!/usr/bin/env python3
# IMPORT FASE 1 (24/10/2026) — legge il foglio Google via export XLSX (righe PULITE,
# a differenza del CSV gviz che fonde intestazione e primi dati del foglio SPECIALIZZAZIONI)
# Uso: python3 import-fase1.py [--simula BUBOLA,ZANAGA,RUBIN] [--genera]
# NON tocca il database: genera SQL da verificare. Origine: foglio Drive del nucleo.

import sys, urllib.request, io, json, openpyxl

SHEET = '16iY_urOb3pyzM2sXtDRLHK0aEt73Rcd3MtgJW9L_8DQ'
GRADI = {'FF.TT.': 'D', 'DVD': 'DVD', 'D': 'D', 'VD': 'VD', 'IA': 'IA', 'CRE': 'CRE', 'CR': 'CR',
         'CSE': 'CSE', 'CS': 'CS', 'VC': 'VC', 'VE': 'VE', 'VF': 'VF'}
COMANDI = {'DIREZIONE VENETO': 'DIREZIONE REGIONALE VENETO', 'VENEZIA': 'VENEZIA', 'PADOVA': 'PADOVA',
           'TREVISO': 'TREVISO', 'VERONA': 'VERONA', 'VICENZA': 'VICENZA', 'BELLUNO': 'BELLUNO',
           'ROVIGO': 'ROVIGO', 'UDINE': 'UDINE', 'PORDENONE': 'PORDENONE', 'TRIESTE': 'TRIESTE', 'GORIZIA': 'GORIZIA'}
TURNI = {'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'G': 'G', 'M': 'G', 'GIORNALIERO': 'G'}

def pulisci(x):
    if isinstance(x, float) and x == int(x):
        return str(int(x))
    return ' '.join(str(x or '').split()).strip()

def estrai_cf(x):
    import re
    t = pulisci(x).upper()
    m = re.search(r'"([A-Z0-9]{16})"', t)
    if m: return m.group(1)
    m = re.match(r'^([A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z])$', t)
    return m.group(1) if m else t

def normalizza_tel(x):
    t = pulisci(x).replace(' ', '').replace('.', '').replace('-', '').replace('(', '').replace(')', '')
    if t.startswith('+39'): t = t[3:]
    if t.startswith('0039'): t = t[4:]
    return t

def data_iso(x):
    import datetime
    if isinstance(x, datetime.datetime) or isinstance(x, datetime.date):
        return x.strftime('%Y-%m-%d')
    s = pulisci(x)
    if '/' in s:
        p = s.split('/')
        if len(p) == 3 and len(p[2]) == 4:
            return f"{p[2]}-{int(p[1]):02d}-{int(p[0]):02d}"
    return None

def scarica():
    url = f'https://docs.google.com/spreadsheets/d/{SHEET}/export?format=xlsx'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return openpyxl.load_workbook(io.BytesIO(urllib.request.urlopen(req).read()))

# DATI ANAGRAFICI — POSIZIONI FISSE (verificate sull'export XLSX; le intestazioni del foglio
# sono spezzate su piu' righe e inaffidabili):
# col1 ID, col2 CF, col3 COGNOME, col4 NOME, col5 NASCITA, col6 LUOGO, col7 TEL USATO,
# col8 TEL SERVIZIO, col9 TEL CASA, col10 EMAIL, col11 EMAIL SERVIZIO, col12 GRADO,
# col13 COMANDO, col14 SEDE, col15 TURNO, col16 SALTO, col17 CORSO USAR, col18 ICE NOME,
# col19 ICE TEL, col20 MISSIONI, col21 ULTIMO AGG, col22 PDF
def righe_foglio(wb, nome, max_col=22, riga_dati=5):
    ws = wb[nome]
    out = []
    for r in range(riga_dati, ws.max_row + 1):
        vals = [ws.cell(row=r, column=c).value for c in range(1, max_col + 1)]
        if any(pulisci(v) for v in vals):
            out.append((None, vals))
    return out

def main():
    simula = None; genera = '--genera' in sys.argv
    if '--simula' in sys.argv:
        simula = sys.argv[sys.argv.index('--simula') + 1].split(',')
    print('Scarico il foglio Google (export XLSX)...')
    wb = scarica()

    # ---- SPECIALIZZAZIONI per codice fiscale (dedup livello più alto) ----
    spec = {}
    for header, v in righe_foglio(wb, 'SPECIALIZZAZIONI', 16, riga_dati=2):
        cf = estrai_cf(v[2])  # col3 CF = indice 2 (gestisce formule =UPPER)
        if not cf or len(cf) < 10: continue
        # POSIZIONI FISSE: col3 CF, col6 FUNZ, col7 STAFF, col8 LOGISTA, col9 NBCR,
        # col10 EST, col11 CINOFILO, col12 SAF, col13 TAS, col14 SAPR, col15 MEDICO, col16 INFERMIERE
        su = lambda i: pulisci(v[i - 1]).upper() if i - 1 < len(v) else ''
        sp = {
            'funzionario': su(6) == 'SI', 'staff': su(7) == 'SI',
            'logista': su(8) == 'SI', 'nbcr_raw': su(9),
            'est_raw': su(10), 'k9': su(11) == 'SI',
            'saf_raw': su(12), 'tas_raw': ('2' if su(13) == 'SI' else su(13)), 'sapr': su(14) == 'SI',
            'medico': su(15) == 'SI', 'infermiere': su(16) == 'SI',
        }
        prec = spec.get(cf)
        if not prec:
            spec[cf] = sp; continue
        nbcr_lv = lambda s: next((int(c) for c in s if c.isdigit()), 0)
        if nbcr_lv(sp['nbcr_raw']) > nbcr_lv(prec['nbcr_raw']): prec['nbcr_raw'] = sp['nbcr_raw']
        if sp['est_raw'] and not prec['est_raw']: prec['est_raw'] = sp['est_raw']
        if sp['saf_raw'] and not prec['saf_raw']: prec['saf_raw'] = sp['saf_raw']
        if sp['tas_raw'] and not prec['tas_raw']: prec['tas_raw'] = sp['tas_raw']
        for k in ('funzionario','staff','logista','k9','sapr','medico','infermiere'):
            if sp[k]: prec[k] = True
    print(f'Specializzazioni: {len(spec)} codici fiscali')

    # ---- ANAGRAFICA (POSIZIONI FISSE: v[i] = colonna i+1) ----
    anagrafica = righe_foglio(wb, 'DATI ANAGRAFICI')
    print(f'Anagrafica: {len(anagrafica)} righe')
    print('\n===== TRASFORMAZIONE (foglio -> app) =====')
    for header, v in anagrafica:
        pul = lambda i: pulisci(v[i - 1])
        up = lambda i: pul(i).upper()
        cf = estrai_cf(v[1])
        cognome, nome = up(3), up(4)
        if simula and not any(s in cognome for s in simula): continue
        email = pul(10).lower()
        email_servizio = pul(11).lower()
        grado_raw = up(12)
        comando_raw = up(13)
        turno_raw = up(15)
        turno = TURNI.get(turno_raw)
        salto = up(16) if turno in ('A','B','C','D') else None
        sede = up(14)
        if sede == 'CENTRALE':
            sede = 'Centrale Direzione' if 'DIREZIONE' in comando_raw else ('Centrale Mestre' if comando_raw == 'VENEZIA' else 'Centrale ' + (COMANDI.get(comando_raw) or '').title())
        sp = spec.get(cf, {})
        saf_u = sp.get('saf_raw', '')
        saf = '2A - AVANZATO' if ('2A' in saf_u or 'AVANZATO' in saf_u) else ('1B - BASICO' if ('1B' in saf_u or 'BASICO' in saf_u) else ('1A' if '1A' in saf_u else None))
        nbcr_lv = next((int(c) for c in sp.get('nbcr_raw', '') if c.isdigit()), 0)
        tas = int(sp['tas_raw'][-1]) if sp.get('tas_raw') and sp['tas_raw'][-1].isdigit() else None
        est = next((e for e in ('NR','LPG','LNG') if e in sp.get('est_raw', '')), None)
        riga = {
            'cognome': cognome, 'nome': nome, 'email': email or None, 'email_servizio': email_servizio or None,
            'cf': cf or None, 'data_nascita': data_iso(v[4]), 'luogo_nascita': pul(6),
            'cellulare': normalizza_tel(v[6]), 'tel_servizio': normalizza_tel(v[7]), 'tel_casa': normalizza_tel(v[8]),
            'grado': GRADI.get(grado_raw), 'grado_raw': grado_raw,
            'comando': COMANDI.get(comando_raw), 'comando_raw': comando_raw, 'sede': sede,
            'turno': turno, 'salto_turno': salto,
            'corso_usar': data_iso(v[16]),
            'ice_nome': pul(18), 'ice_tel': normalizza_tel(v[18]),
            'missioni_int': up(20) == 'SI',
            'spec': {
                'funzionario': sp.get('funzionario', False), 'staff': sp.get('staff', False),
                'logista': sp.get('logista', False), 'nbcr': nbcr_lv, 'nbcr_est': est,
                'k9': sp.get('k9', False), 'saf': saf, 'tas': tas,
                'sapr': sp.get('sapr', False), 'medico': sp.get('medico', False),
                'infermiere': sp.get('infermiere', False),
            }
        }
        print(json.dumps(riga, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
