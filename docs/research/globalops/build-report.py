"""Converte o relatório local e exporta a tabela de prioridades, sem dependências externas."""
from pathlib import Path
import re
import html
import csv

root = Path(__file__).resolve().parent
lines = (root / 'relatorio.md').read_text().splitlines()

def inline(s):
    s = html.escape(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)', r'<a href="\2">\1</a>', s)
    return s

out, toc = [], []
i = 0
while i < len(lines):
    line = lines[i]
    if not line.strip():
        i += 1
        continue
    if line.startswith('#'):
        level = len(line) - len(line.lstrip('#'))
        title = line[level:].strip()
        anchor = 'section-' + str(i)
        out.append(f'<h{level} id="{anchor}">{inline(title)}</h{level}>')
        if level == 2:
            toc.append(f'<li><a href="#{anchor}">{html.escape(title)}</a></li>')
        i += 1
    elif line.startswith('|'):
        table = []
        while i < len(lines) and lines[i].startswith('|'):
            cells = [s.strip() for s in lines[i].strip('|').split('|')]
            if not all(re.fullmatch(r'[-: ]+', s) for s in cells):
                table.append(cells)
            i += 1
        out.append('<div class="table-scroll"><table><thead><tr>' + ''.join('<th scope="col">'+inline(s)+'</th>' for s in table[0]) + '</tr></thead><tbody>')
        for row in table[1:]:
            out.append('<tr>' + ''.join('<td>'+inline(s)+'</td>' for s in row) + '</tr>')
        out.append('</tbody></table></div>')
        if table[0][0] == 'Prioridade':
            with (root / 'prioridades.csv').open('w', newline='', encoding='utf-8-sig') as f:
                csv.writer(f).writerows(table)
    elif re.match(r'^(- |\d+\. )', line):
        ordered = bool(re.match(r'^\d+\. ', line))
        tag = 'ol' if ordered else 'ul'
        pattern = r'^\d+\. ' if ordered else r'^- '
        out.append('<'+tag+'>')
        while i < len(lines) and re.match(pattern, lines[i]):
            out.append('<li>'+inline(re.sub(pattern, '', lines[i]))+'</li>')
            i += 1
        out.append('</'+tag+'>')
    else:
        paragraph = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^(#|\||- |\d+\. )', lines[i]):
            paragraph.append(lines[i])
            i += 1
        out.append('<p>'+inline(' '.join(paragraph))+'</p>')

styles = '''
:root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;color:#202124;background:#fff}
*{box-sizing:border-box}body{margin:0}main{max-width:1040px;margin:auto;padding:56px 48px 80px}
h1{font-size:38px;line-height:1.12;letter-spacing:-1.1px;margin:0 0 32px;font-weight:700}
h2{font-size:25px;line-height:1.25;margin:48px 0 18px;padding-top:14px;border-top:1px solid #bbb;scroll-margin-top:24px}
h3{font-size:18px;line-height:1.35;margin:28px 0 12px}p,li{font-size:16px;line-height:1.65}p{margin:0 0 18px}li{margin-bottom:10px}
a{color:#243c52;text-decoration:underline;text-underline-offset:3px}a:focus-visible{outline:3px solid #243c52;outline-offset:3px}
code{font-family:ui-monospace,monospace;font-size:.85em;overflow-wrap:anywhere}
.table-scroll{overflow-x:auto;margin:24px 0 28px}table{width:100%;border-collapse:collapse;font-size:13px;line-height:1.45}
th{text-align:left;vertical-align:top;background:#eceeef;border-bottom:2px solid #777;padding:11px 10px;font-weight:700}
td{vertical-align:top;border-bottom:1px solid #ccc;padding:11px 10px}tbody tr:nth-child(even){background:#fafafa}
nav{margin:32px 0 44px;border-top:1px solid #bbb;border-bottom:1px solid #bbb;padding:18px 0}nav summary{font-size:17px;font-weight:bold;cursor:pointer}nav ol{columns:2;padding-left:22px}nav li{font-size:13px;line-height:1.5;break-inside:avoid;margin-bottom:8px}
.actions{margin-top:24px;font-size:13px;display:flex;gap:24px;flex-wrap:wrap}button{background:white;border:1px solid #999;color:#222;font:inherit;padding:9px 14px;cursor:pointer}
@media(max-width:650px){main{padding:28px 20px}h1{font-size:30px}h2{font-size:23px}nav ol{columns:1}table{min-width:660px}p,li{font-size:15px}}
@media print{@page{size:A4;margin:15mm}main{padding:0;max-width:none}nav,.actions{display:none}h1{font-size:25pt;margin-bottom:8mm}h2{font-size:16pt;margin-top:9mm;padding-top:4mm;break-after:avoid}h3{font-size:12pt;break-after:avoid}p,li{font-size:10pt;line-height:1.42;margin-bottom:3mm}p{orphans:3;widows:3}table{font-size:8.2pt;min-width:0}th,td{padding:2.2mm}thead{display:table-header-group}tr{break-inside:avoid}.table-scroll{overflow:visible;margin:4mm 0}a{color:#222;text-decoration:underline}code{font-size:8pt}}
'''
body = '\n'.join(out)
nav = '<nav aria-label="Índice do relatório"><details><summary>Índice do relatório</summary><ol>'+''.join(toc)+'</ol></details><div class="actions"><a href="prioridades.csv" download>Descarregar prioridades (CSV)</a><a href="relatorio.md" download>Texto em Markdown</a><button onclick="window.print()">Imprimir / guardar PDF</button></div></nav>'
end_first_paras = body.index('<h2')
body = body[:end_first_paras] + nav + body[end_first_paras:]
(root / 'relatorio.html').write_text('<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Evolução da GlobalOps</title><style>'+styles+'</style></head><body><main>'+body+'</main></body></html>')
print('Criados relatorio.html e prioridades.csv')
