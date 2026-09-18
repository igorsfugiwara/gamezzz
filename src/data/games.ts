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
    slug: 'snake',
    title: 'Snake',
    description: 'O jogo da cobrinha com três dificuldades de verdade: atravessar paredes, encarar paredes sólidas ou desviar de obstáculos.',
    longDescription: 'Snake nasceu nos fliperamas em 1976 e virou febre mundial nos celulares Nokia. Nesta versão as três dificuldades mudam a forma de jogar, não só a velocidade: no Fácil a cobra atravessa as paredes, no Médio elas matam e o jogo acelera conforme você come, e no Difícil ainda há blocos espalhados pelo mapa. Cada dificuldade guarda o próprio recorde.',
    howToPlay: [
      'Use as setas ou WASD para mudar de direção — no celular, deslize ou use os botões',
      'Coma as frutas vermelhas para crescer e pontuar',
      'No Fácil você atravessa as paredes; no Médio e no Difícil elas matam',
      'No Difícil desvie também dos blocos cinza',
      'Espaço pausa a partida; Enter reinicia no fim',
    ],
    category: 'clássico',
    tags: ['snake', 'cobrinha', 'arcade', 'clássico', 'reflexos'],
    embedType: 'iframe-internal',
    src: '/games/snake.html',
    thumbnail: '/thumbnails/snake.png',
    featured: true,
  },
  {
    slug: 'memoria-rock',
    title: 'Memória Rock',
    description: 'Jogo da memória com 18 bandas lendárias do rock. Cartas animadas em 3D e uma curiosidade a cada par que você forma.',
    longDescription: 'Um jogo da memória em que o tema é conteúdo: cada par revela uma banda, o ano de formação e uma curiosidade sobre ela. São 18 bandas, de Led Zeppelin a Pearl Jam, com emblemas desenhados à mão em SVG. As cartas viram em 3D de verdade, comemoram o acerto e tremem no erro. Três modos, do Ensaio de 6 pares à Turnê de 12.',
    howToPlay: [
      'Clique ou toque numa carta para virá-la',
      'Vire duas: se forem a mesma banda, o par fica aberto',
      'Se forem diferentes, elas voltam a virar para baixo',
      'A cada par formado você descobre uma curiosidade sobre a banda',
      'Feche todos os pares — quanto menos jogadas, melhor a classificação',
    ],
    category: 'cartas',
    tags: ['memória', 'rock', 'bandas', 'cartas', 'raciocínio'],
    embedType: 'iframe-internal',
    src: '/games/memoria-rock.html',
    thumbnail: '/thumbnails/memoria-rock.png',
    featured: true,
  },
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
