export interface Game {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  howToPlay: string[];
  category: 'ação' | 'estratégia' | 'cartas' | 'clássico';
  tags: string[];
  embedType: 'iframe-internal' | 'iframe-external';
  src: string;
  thumbnail: string;
  featured: boolean;
}

export const games: Game[] = [
  {
    slug: 'pong',
    title: 'Pong',
    description: 'O clássico jogo de pingue-pongue dos arcades dos anos 70. Desafie o computador e teste seus reflexos.',
    longDescription: 'Pong é um dos primeiros videogames de sucesso comercial, lançado pela Atari em 1972. Nesta versão digital você controla uma raquete e tenta marcar pontos contra o computador. Um jogo simples, viciante e que atravessou gerações.',
    howToPlay: [
      'Use W e S ou as setas para mover sua raquete',
      'Impeça a bola de passar pela sua raquete',
      'Cada vez que o adversário perde a bola você marca um ponto',
      'Primeiro a chegar a 10 pontos vence',
    ],
    category: 'clássico',
    tags: ['pong', 'arcade', 'clássico', 'reflexos'],
    embedType: 'iframe-internal',
    src: '/games/pong.html',
    thumbnail: '/thumbnails/pong.png',
    featured: true,
  },
  {
    slug: 'catan',
    title: 'Catan',
    description: 'O famoso jogo de estratégia de construção de civilizações. Colete recursos, construa cidades e vença.',
    longDescription: 'Catan é um dos jogos de tabuleiro mais populares do mundo. Nesta versão digital você enfrenta NPCs com diferentes níveis de dificuldade, negocia recursos e expande seu território na ilha de Catan.',
    howToPlay: [
      'Role os dados para coletar recursos das suas terras',
      'Use recursos para construir estradas, casas e cidades',
      'Negocie com o banco ou com os NPCs',
      'Primeiro a atingir 10 pontos de vitória vence',
    ],
    category: 'estratégia',
    tags: ['catan', 'estratégia', 'tabuleiro', 'recursos'],
    embedType: 'iframe-external',
    src: 'https://mery-catan.netlify.app',
    thumbnail: '/thumbnails/catan.png',
    featured: true,
  },
  {
    slug: 'poke-trunfo',
    title: 'PokéTrunfo',
    description: 'Super Trunfo com cartas de Pokémon. Compare atributos e colete todas as cartas do adversário para vencer.',
    longDescription: 'PokéTrunfo é uma versão digital do clássico Super Trunfo usando dados reais de mais de 900 Pokémon da PokéAPI. Escolha o atributo mais forte da sua carta e supere o adversário.',
    howToPlay: [
      'Você e o computador recebem uma carta de Pokémon cada',
      'Escolha o atributo que acredita ser maior',
      'HP, Ataque, Defesa, Ataque Especial, Defesa Especial ou Velocidade',
      'Quem tiver o maior valor vence a rodada e fica com a carta',
      'Colete todas as cartas para vencer',
    ],
    category: 'cartas',
    tags: ['pokemon', 'super trunfo', 'cartas', 'estratégia'],
    embedType: 'iframe-external',
    src: 'https://poke-trunfo.netlify.app',
    thumbnail: '/thumbnails/poke-trunfo.png',
    featured: true,
  },
];
