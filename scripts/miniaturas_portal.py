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
    'Y': ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
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

# ─── DOBRA ─────────────────────────────────────────────────────
def peca_dobra(img, tipo, x, y, tam):
    src = (J / 'dobra/desenho.ts').read_text()
    m = re.search(tipo + r": \{\s+cores: \{([^}]*)\},\s+arte: \[([^\]]*)\]", src)
    cores = {}
    for k, v in re.findall(r"(\w): (PALETA\.\w+|'#[0-9a-f]{6}')", m.group(1)):
        cores[k] = PAL[v.split('.')[1]] if v.startswith('PALETA') else v.strip("'")
    arte = re.findall(r"'([^']*)'", m.group(2))
    d = ImageDraw.Draw(img)
    px = tam / 8
    for r, l in enumerate(arte):
        for c, ch in enumerate(l):
            if ch in cores:
                d.rectangle([x + c * px, y + r * px, x + (c + 1) * px - 1, y + (r + 1) * px - 1], fill=rgb(cores[ch]))

def dobra():
    img = fundo('#fff6dd', '#f2dfb3')
    d = ImageDraw.Draw(img)
    cel, ox, oy, n = 58, 250, 70, 6
    # sombra e papel
    d.rectangle([ox + 6, oy + 8, ox + n * cel + 6, oy + 5 * cel + 8], fill=rgb('#e4d0a2'))
    for y in range(5):
        for x in range(n):
            d.rectangle([ox + x * cel, oy + y * cel, ox + (x + 1) * cel - 1, oy + (y + 1) * cel - 1], fill=rgb('#fbf3df' if (x + y) % 2 else '#f8eed6'))
    # metade direita levantando (dobra em andamento)
    d.polygon([(ox + 4 * cel, oy), (ox + 4 * cel + 40, oy - 30), (ox + 4 * cel + 40, oy + 5 * cel - 30), (ox + 4 * cel, oy + 5 * cel)], fill=rgb('#efe2c2'))
    d.line([(ox + 4 * cel, oy - 6), (ox + 4 * cel, oy + 5 * cel + 6)], fill=rgb('#ff4fa3'), width=4)
    for yy in range(oy - 6, oy + 5 * cel + 6, 14):
        pass
    for x0 in range(ox - 6, ox + n * cel + 6, 16):
        d.line([(x0, oy + 2 * cel), (x0 + 9, oy + 2 * cel)], fill=rgb('#c9a26b'), width=3)
    peca_dobra(img, 'almofada', ox + 2 * cel + 7, oy + 0 * cel + 7, cel - 14)
    peca_dobra(img, 'parede', ox + 3 * cel + 7, oy + 4 * cel + 7, cel - 14)
    peca_dobra(img, 'petisco', ox + 5 * cel + 7, oy + 1 * cel + 7, cel - 14)
    sharpei(img, ox + 4, oy + 4 * cel - 6, 3, pose='feliz')
    # papel picado
    import random
    random.seed(4)
    for _ in range(40):
        x, y = random.randint(40, 760), random.randint(10, 440)
        d.rectangle([x, y, x + 6, y + 3], fill=rgb(random.choice(['#ff4fa3', '#f6c443', '#5aa9e6', '#4fa64a'])))
    titulo(d, 'DOBRA', 40, 360, 8, '#ff4fa3', sombra=PAL['chocolate'])
    return img

# ─── RODA ──────────────────────────────────────────────────────
def sprite_roda(nome):
    src = (J / 'roda/sprites.ts').read_text()
    m = re.search(r"export const " + nome + r" = arteParaSprite\(\[\n((?:\s+'[^']*',\n)+)\], \{([^}]*)\}", src)
    arte = re.findall(r"'([^']*)'", m.group(1))
    cores = {k: PAL[v] for k, v in re.findall(r"(\w): P\.(\w+)", m.group(2))}
    return arte, cores

def pessoa_roda(s, tipo='povo'):
    src = (J / 'roda/sprites.ts').read_text()
    lista = lambda n: [PAL[v] for v in re.findall(r"P\.(\w+)", re.search(n + r" = \[([^\]]*)\]", src).group(1))]
    peles, cabelos, roupas, calcas = lista('PELES'), lista('CABELOS'), lista('ROUPAS'), lista('CALCAS')
    arte = re.findall(r"'([^']*)'", re.search(r"const PESSOA = \[([^\]]*)\]", src).group(1))
    cores = {'h': cabelos[s % len(cabelos)], 's': peles[(s * 3) % len(peles)], 'k': PAL['preto'],
             'c': roupas[(s * 7) % len(roupas)], 'p': calcas[(s * 5) % len(calcas)]}
    if tipo == 'motoboy':
        arte = ['.hhhhhh.', 'hhhhhhhh', 'hvvvvvvh', '..ssss..', '..ssss..', 'bbcccccc', 'bbcccccc', 'bbcccc.s', '..pppp..', '..p..p..', '..k..k..']
        cores.update(h=PAL['vermelho'] if s % 2 else PAL['asfalto'], v=PAL['neon_ciano'], b=PAL['folha'], c=PAL['asfalto'])
    return arte, cores

def pinta(img, arte, cores, x, y, px):
    d = ImageDraw.Draw(img)
    for r, l in enumerate(arte):
        for c, ch in enumerate(l):
            if ch in cores:
                d.rectangle([x + c * px, y + r * px, x + (c + 1) * px - 1, y + (r + 1) * px - 1], fill=rgb(cores[ch]))

def roda():
    import math
    sp = sprites()
    img = fundo('#1a1426', '#2b2233')
    d = ImageDraw.Draw(img)
    d.rectangle([0, 300, 800, 450], fill=rgb(PAL['asfalto']))
    for x in range(20, 800, 60):
        d.rectangle([x, 372, x + 34, 380], fill=rgb(PAL['neblina']))
    pinta(img, *sprite_roda('PREDIO'), 470, 40, 9)
    cx, cy, rx, ry = 570, 330, 220, 70
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], outline=rgb(PAL['neon_rosa']), width=4)
    povo = sp['roda']['povo']
    pessoas = []
    for i in range(16):
        a = i / 16 * 2 * math.pi + 0.3
        pessoas.append((math.sin(a), cx + math.cos(a) * rx, cy + math.sin(a) * ry, i))
    for z, x, y, i in sorted(pessoas):
        g = povo[i % len(povo)]
        colar_grade(img, g, int(x - g['w']), int(y - g['h'] * 2), 2)
    v = sp['roda']['vocal']
    colar_grade(img, v, 60, 400 - v['h'] * 3, 3)
    titulo(d, 'RODA', 40, 40, 12, PAL['neon_rosa'], sombra=PAL['neon_ciano'])
    return img

# ─── Bonecos exportados (npx vite-node scripts/exportar-sprites.ts) ───
def sprites():
    import json
    return json.loads((RAIZ / 'scripts/sprites.json').read_text())

def colar_grade(img, g, x, y, k):
    d = ImageDraw.Draw(img)
    for i, c in enumerate(g['cor']):
        if not c:
            continue
        gx, gy = i % g['w'], i // g['w']
        d.rectangle([x + gx * k, y + gy * k, x + gx * k + k - 1, y + gy * k + k - 1], fill=rgb(c))

# ─── DIY - FAÇA VOCÊ MESMO ─────────────────────────────────────
def faca():
    sp = sprites()
    img = fundo('#1a1426', PAL['preto'])
    d = ImageDraw.Draw(img)
    # Varal de luz e fachos.
    for x in range(10, 800, 22):
        d.rectangle([x, 12 + (x // 22 % 2) * 4, x + 6, 18 + (x // 22 % 2) * 4], fill=rgb([PAL['neon_rosa'], PAL['amarelo'], PAL['neon_ciano']][x // 22 % 3]))
    # Palco.
    d.rectangle([360, 330, 800, 450], fill=rgb(PAL['chocolate']))
    d.rectangle([360, 330, 800, 336], fill=rgb(PAL['ruga']))
    for x in range(360, 800, 40):
        d.line([(x, 336), (x, 450)], fill=rgb(PAL['noite']), width=2)
    # Banda (3×) em cima do palco.
    for i, q in enumerate(['guitarra', 'vocal', 'baixo', 'bateria']):
        g = sp['banda'][q]
        colar_grade(img, g, 372 + i * 104, 336 - g['h'] * 3 + 12, 3)
    # Público na frente com chifres e mãos pro alto (cortado embaixo).
    for i, g in enumerate(sp['publico'][:9]):
        colar_grade(img, g, -10 + i * 92, 300 + (i % 2) * 24, 3)
    # Logo: DIY grande + faixa.
    d.rectangle([40 + 10, 40 + 10, 330 + 10, 190 + 10], fill=rgb(PAL['neon_rosa']))
    d.rectangle([40, 40, 330, 190], fill=rgb('#ebe5d6'))
    titulo(d, 'DIY', 66, 66, 14, '#16140f')
    d.rectangle([52, 204, 322, 246], fill=rgb(PAL['amarelo']))
    fonte = ImageFont.truetype(FONTE, 22)
    d.text((66, 212), 'FAÇA VOCÊ MESMO', font=fonte, fill=rgb('#16140f'))
    return img

GERADORES = {'pixo': pixo, 'dobra': dobra, 'roda': roda, 'faca': faca}

if __name__ == '__main__':
    for nome in sys.argv[1:] or GERADORES:
        if nome not in GERADORES:
            continue
        destino = RAIZ / 'public/thumbnails' / f'{nome}-v1.png'
        GERADORES[nome]().save(destino, optimize=True)
        print('ok', destino.relative_to(RAIZ))
