"""
Miniaturas 800x450 dos jogos do portal (public/thumbnails/<jogo>-v1.png).

Desenhadas com os mesmos dados dos jogos (paleta, desenhos do PIXO, sprite
do Shar Pei), para a miniatura ser fiel ao que a pessoa vai jogar.
Uso: python3 scripts/miniaturas_portal.py [pixo|dobra|roda|faca ...]
"""
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
J = RAIZ / 'jogos'
PAL = dict(re.findall(r"(\w+): '(#[0-9a-f]{6})'", (J / 'compartilhado/paleta.ts').read_text()))
FONTE = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

# Fonte 5x7 em pixel para os títulos (só as letras usadas).
LETRAS = {
    'A': ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    'B': ['####.', '#...#', '####.', '#...#', '#...#', '#...#', '####.'],
    'C': ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
    'D': ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    'E': ['#####', '#....', '####.', '#....', '#....', '#....', '#####'],
    'F': ['#####', '#....', '####.', '#....', '#....', '#....', '#....'],
    'I': ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
    'M': ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
    'O': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'P': ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    'R': ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    'S': ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    'U': ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    'V': ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
    'X': ['#...#', '.#.#.', '..#..', '..#..', '..#..', '.#.#.', '#...#'],
    'Ç': ['.####', '#....', '#....', '#....', '#....', '.####', '..#..'],
    'Ê': ['.#.#.', '#####', '#....', '####.', '#....', '#....', '#####'],
    ' ': ['.....'] * 7,
}

def titulo(d, texto, x, y, px, cor, sombra=None):
    for i, ch in enumerate(texto):
        for r, linha in enumerate(LETRAS[ch]):
            for c, v in enumerate(linha):
                if v == '#':
                    xx, yy = x + (i * 6 + c) * px, y + r * px
                    if sombra:
                        d.rectangle([xx + px // 2, yy + px // 2, xx + px + px // 2 - 1, yy + px + px // 2 - 1], fill=rgb(sombra))
                    d.rectangle([xx, yy, xx + px - 1, yy + px - 1], fill=rgb(cor))

def largura_titulo(texto, px):
    return len(texto) * 6 * px - px

def sharpei(img, x, y, px, pose='sentado', espelhar=False, acessorios=()):
    src = (J / 'compartilhado/sharpei.ts').read_text()
    cores = {k: PAL[v] for k, v in re.findall(r"(\w): PALETA\.(\w+)", src)}
    def bloco(nome):
        m = re.search(nome + r": \[\n((?:\s+'[^']*',\n)+)", src)
        return re.findall(r"'([^']*)'", m.group(1))
    d = ImageDraw.Draw(img)
    for camada in [bloco(pose)] + [bloco(a) for a in acessorios]:
        for r, linha in enumerate(camada):
            for c, ch in enumerate(linha):
                if ch in cores:
                    cc = 15 - c if espelhar else c
                    d.rectangle([x + cc * px, y + r * px, x + cc * px + px - 1, y + r * px + px - 1], fill=rgb(cores[ch]))

def fundo(cor_topo, cor_base):
    img = Image.new('RGB', (800, 450))
    a, b = rgb(cor_topo), rgb(cor_base)
    d = ImageDraw.Draw(img)
    for y in range(450):
        t = y / 449
        d.line([(0, y), (800, y)], fill=tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)))
    return img

# ─── PIXO ──────────────────────────────────────────────────────
def desenhos_pixo():
    src = (J / 'pixo/desenhos.ts').read_text()
    fundos = {m[0]: PAL[m[1]] for m in re.findall(r"id: '([\w-]+)', nome: '[^']+', fundo: PALETA\.(\w+)", src)}
    out = {}
    for id_, nome, col, cores, arte in re.findall(
            r"id: '([\w-]+)', nome: '([^']+)', colecao: '([\w-]+)',\s+cores: \{([^}]*)\},\s+arte: \[\n((?:\s+'[^']*',\n)+)", src):
        cm = {k: PAL[v] for k, v in re.findall(r"(\w): P\.(\w+)", cores)}
        out[id_] = (re.findall(r"'([^']*)'", arte), cm, fundos[col])
    return out

def figurinha(img, x, y, cel, arte, cm, fundo_cor, borda=6):
    d = ImageDraw.Draw(img)
    n = len(arte)
    d.rectangle([x - borda, y - borda, x + n * cel + borda - 1, y + n * cel + borda - 1], fill=rgb(PAL['branco']))
    for r, l in enumerate(arte):
        for c, ch in enumerate(l):
            h = rgb(fundo_cor) if ch == '.' else rgb(cm.get(ch) or cm.get(ch.upper()))
            d.rectangle([x + c * cel, y + r * cel, x + (c + 1) * cel - 1, y + (r + 1) * cel - 1], fill=h)

def pixo():
    img = fundo('#241f33', PAL['noite'])
    d = ImageDraw.Draw(img)
    fonte = ImageFont.truetype(FONTE, 15)
    ds = desenhos_pixo()
    arte, cm, fd = ds['coxinha']
    sol = [[ch != '.' and ch == ch.upper() for ch in l] for l in arte]
    n, cel, x0, y0 = 10, 26, 150, 120
    def pistas(linha):
        out, k = [], 0
        for v in linha:
            if v: k += 1
            elif k: out.append(k); k = 0
        if k: out.append(k)
        return out or [0]
    # metade de cima pintada, embaixo ainda em branco: o jogo em andamento
    for r in range(n):
        txt = ' '.join(map(str, pistas(sol[r])))
        w = d.textlength(txt, font=fonte)
        d.text((x0 - 10 - w, y0 + r * cel + 4), txt, font=fonte, fill=rgb(PAL['papel']))
        for c in range(n):
            cheia = sol[r][c] and r < 6
            cor = PAL['asfalto'] if cheia else PAL['papel']
            d.rectangle([x0 + c * cel, y0 + r * cel, x0 + (c + 1) * cel - 2, y0 + (r + 1) * cel - 2], fill=rgb(cor))
    for c in range(n):
        col = pistas([sol[r][c] for r in range(n)])
        for i, v in enumerate(reversed(col)):
            d.text((x0 + c * cel + 8, y0 - 22 - i * 18), str(v), font=fonte, fill=rgb(PAL['papel']))
    # figurinhas reveladas à direita
    for i, (id_, (x, y, c)) in enumerate({'copo-americano': (500, 70, 11), 'capivara': (640, 120, 9), 'orelhao': (520, 250, 11)}.items()):
        a, m, f = ds[id_]
        figurinha(img, x, y, c, a, m, f)
    sharpei(img, 660, 300, 6, pose='feliz', acessorios=('chapeu',))
    titulo(d, 'PIXO', 40, 30, 6, PAL['amarelo'], sombra=PAL['vermelho'])
    return img

GERADORES = {'pixo': pixo}

if __name__ == '__main__':
    for nome in sys.argv[1:] or GERADORES:
        if nome not in GERADORES:
            continue
        destino = RAIZ / 'public/thumbnails' / f'{nome}-v1.png'
        GERADORES[nome]().save(destino, optimize=True)
        print('ok', destino.relative_to(RAIZ))
