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
| **Pong** | Clássico | O arcade original da Atari (1972). Raquete, bola, reflexos. |
| **Catan** | Estratégia | Construa cidades, colete recursos, domine a ilha. |
| **PokéTrunfo** | Cartas | Super Trunfo com 900+ Pokémon reais via PokéAPI. |

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

## Deploy

O projeto é deployado automaticamente na **Vercel** a cada push na branch `main`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/games-igor/games-hub)

---

## Licença

MIT — use, modifique e distribua à vontade.
