# gamezzz one 🎮

> Jogos clássicos e originais direto no navegador — sem download, sem cadastro, sem custo.

**[gamezzz-one.vercel.app](https://gamezzz-one.vercel.app)**

---

## O que é

**gamezzz one** é uma plataforma de jogos gratuitos que roda 100% no browser. O objetivo é simples: abriu, jogou. Nada de app store, nada de conta, nada de instalação.

Cada jogo é construído com tecnologias web modernas — HTML5 Canvas, TypeScript, APIs públicas — e funciona em qualquer dispositivo com um navegador decente.

---

## Jogos disponíveis

| Jogo | Categoria | Descrição |
|------|-----------|-----------|
| **Xadrez** | Estratégia | Regras oficiais completas contra um motor de IA em três níveis. |
| **Snake** | Clássico | A cobrinha com três dificuldades que mudam as regras. |
| **Memória Rock** | Cartas | Jogo da memória com 18 bandas de rock e uma curiosidade por par. |
| **Pong** | Clássico | O arcade original da Atari (1972). Raquete, bola, reflexos. |
| **Catan** | Estratégia | Catan em 3D contra três adversários do computador. |
| **PokéTrunfo** | Cartas | Super Trunfo com os 151 Pokémon originais via PokéAPI. |

---

## Stack

- **Framework** — [Next.js 14](https://nextjs.org) (App Router)
- **Linguagem** — TypeScript
- **Estilo** — SCSS Modules
- **Deploy** — Vercel
- **Jogos** — HTML5 Canvas + JavaScript puro

---

## Rodando localmente

```bash
# Clone o repositório
git clone https://github.com/games-igor/games-hub.git
cd games-hub

# Instale as dependências
npm install

# Suba o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção localmente |
| `npm run lint` | Verifica o código com ESLint |

---

## Estrutura do projeto

```
src/
├── app/
│   ├── layout.tsx        # Layout global (Navbar + Footer + AdSense)
│   └── page.tsx          # Página inicial
├── components/
│   ├── Navbar/
│   ├── Footer/
│   ├── GameCard/
│   └── AdBanner/
├── data/
│   └── games.ts          # Catálogo de jogos
└── styles/
    └── globals.scss
```

---

## Adicionando um novo jogo

Edite [src/data/games.ts](src/data/games.ts) e adicione um objeto seguindo a interface `Game`:

```ts
{
  slug: 'meu-jogo',
  title: 'Meu Jogo',
  description: 'Descrição curta para o card.',
  longDescription: 'Descrição longa para a página do jogo.',
  howToPlay: ['Instrução 1', 'Instrução 2'],
  category: 'ação',          // 'ação' | 'estratégia' | 'cartas' | 'clássico'
  tags: ['tag1', 'tag2'],
  embedType: 'iframe-internal',  // 'iframe-internal' | 'iframe-external'
  src: '/games/meu-jogo.html',   // path local ou URL externa
  thumbnail: '/thumbnails/meu-jogo.png',
  featured: false,
}
```

---

## SEO e AdSense

O que o código já entrega:

- **Metadados por página** — título no formato "Xadrez Online Grátis — Jogar no Navegador", descrição, canonical, Open Graph e Twitter card (a miniatura do jogo é a imagem de compartilhamento; a home usa `src/app/opengraph-image.tsx`).
- **`/sitemap.xml` e `/robots.txt`** gerados a partir de `src/data/games.ts` — jogo novo entra sozinho.
- **Dados estruturados** (JSON-LD): `WebSite` e `ItemList` na home, `VideoGame` e `BreadcrumbList` em cada jogo.
- **Fonte servida pelo próprio site** (`next/font`), sem o `@import` que bloqueava a pintura.
- **Verificação do AdSense** pela meta `google-adsense-account` e `public/ads.txt`.
- **Blocos de anúncio** (`AdBanner`) só aparecem quando há ID de bloco configurado; na página de jogo ficam longe do quadro, onde estão os controles de toque.

### Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL canônica. Padrão `https://gamezzz-one.vercel.app`; troque quando tiver domínio próprio. |
| `GOOGLE_SITE_VERIFICATION` | Código da verificação por "Tag HTML" do Search Console. |
| `NEXT_PUBLIC_ADSENSE_SLOT_HOME` | ID do bloco de anúncio da home (depois da aprovação). |
| `NEXT_PUBLIC_ADSENSE_SLOT_JOGO` | ID do bloco de anúncio das páginas de jogo. |

### O que só dá para fazer nos painéis do Google

1. **Search Console** — adicionar a propriedade por prefixo de URL, verificar pela tag HTML (variável acima) e enviar `/sitemap.xml`.
2. **AdSense → Sites** — adicionar o site e pedir a revisão. `ads.txt` e a meta de verificação já estão no ar.
3. **AdSense → Privacidade e mensagens** — ligar a mensagem de consentimento do Google (obrigatória para visitantes da Europa; a política de privacidade já a descreve).
4. **Depois de aprovado** — ligar os anúncios automáticos e criar dois blocos de display responsivos (home e jogo); os IDs vão nas variáveis acima.
5. **Domínio próprio** — recomendado. Um `.com.br` pesa a favor na revisão do AdSense e na marca nos resultados de busca; com ele, basta trocar `NEXT_PUBLIC_SITE_URL`.

---

## Deploy

O projeto é deployado automaticamente na **Vercel** a cada push na branch `main`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/games-igor/games-hub)

---

## Licença

MIT — use, modifique e distribua à vontade.
