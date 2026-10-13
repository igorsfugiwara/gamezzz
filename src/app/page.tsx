import Link from 'next/link';
import GameCard from '@/components/GameCard/GameCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import JsonLd from '@/components/JsonLd/JsonLd';
import { games, type Game } from '@/data/games';
import { AD_SLOTS, SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site';
import styles from './page.module.scss';

const categorias: { id: Game['category']; icone: string; nome: string; texto: string }[] = [
  { id: 'clássico', icone: '🕹️', nome: 'Clássico', texto: 'Arcade dos anos 70 e 80 reimaginados para o navegador' },
  { id: 'estratégia', icone: '♟️', nome: 'Estratégia', texto: 'Tabuleiro e gestão de recursos com profundidade real' },
  { id: 'cartas', icone: '🃏', nome: 'Cartas', texto: 'Memória e cartas colecionáveis para todos os níveis' },
  { id: 'ação', icone: '⚡', nome: 'Ação', texto: 'Reflexo e habilidade em partidas rápidas' },
  { id: 'quebra-cabeça', icone: '🧩', nome: 'Quebra-cabeça', texto: 'Lógica com desafio do dia e fases que pedem um “aha!”' },
];

// "Xadrez, Snake e Pong" — a lista do texto sai do catálogo e não envelhece
// quando entra jogo novo.
function emLista(nomes: string[]) {
  return nomes.length < 2 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

const dadosEstruturados = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'pt-BR',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Jogos grátis no navegador',
    itemListElement: games.map((game, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: absoluteUrl(`/jogos/${game.slug}`),
      name: game.title,
    })),
  },
];

export default function Home() {
  // Todos os jogos na home: com um catálogo deste tamanho, esconder algum
  // atrás de "destaque" só tira um link interno da página mais forte do site.
  const comJogos = categorias
    .map((c) => ({ ...c, jogos: games.filter((g) => g.category === c.id) }))
    .filter((c) => c.jogos.length > 0);

  return (
    <>
      <JsonLd data={dadosEstruturados} />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Jogos Grátis Online, Direto no Navegador
          </h1>
          <p className={styles.heroDesc}>
            Uma plataforma de jogos clássicos e originais — sem download,
            sem cadastro e sem custo. Jogue agora em qualquer dispositivo.
          </p>
          <span className={styles.badge}>{games.length} jogos disponíveis</span>
        </div>
      </section>

      <div className={styles.container}>
        {/* JOGOS */}
        <section id="jogos" className={styles.section}>
          <h2 className={styles.sectionTitle}>Todos os Jogos</h2>
          <div className={styles.grid3}>
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        <AdBanner slot={AD_SLOTS.home} />

        {/* CATEGORIAS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Categorias</h2>
          <div className={styles.grid2}>
            {comJogos.map((c) => (
              <div key={c.id} className={styles.catCard}>
                <span className={styles.catIcon}>{c.icone}</span>
                <div>
                  <h3>{c.nome}</h3>
                  <p>{c.texto}</p>
                  <p className={styles.catGames}>
                    {c.jogos.map((g, i) => (
                      <span key={g.slug}>
                        {i > 0 && ' · '}
                        <Link href={`/jogos/${g.slug}`} className={styles.link}>
                          {g.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* POR QUE */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Por que gamezzz one?</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🚀</span>
              <h3>Zero instalação</h3>
              <p>Abra o navegador e jogue. Sem app store, sem download, sem espera.</p>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>📱</span>
              <h3>Qualquer dispositivo</h3>
              <p>Otimizado para desktop, tablet e celular com controles touch.</p>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>🔒</span>
              <h3>Sem cadastro</h3>
              <p>Nenhum dado pessoal coletado. Privacidade total garantida.</p>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>💸</span>
              <h3>100% gratuito</h3>
              <p>Todos os jogos são e sempre serão completamente gratuitos.</p>
            </div>
          </div>
        </section>

        {/* SOBRE — texto SEO */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sobre o {SITE_NAME}</h2>
          <div className={styles.aboutText}>
            <p>
              gamezzz one é uma plataforma de jogos gratuitos que roda direto
              no navegador, sem necessidade de download, instalação ou cadastro.
              O objetivo é entregar uma experiência de jogo acessível, rápida e
              divertida para qualquer pessoa com acesso à internet, em qualquer
              dispositivo.
            </p>
            <p>
              Os jogos são construídos com tecnologias modernas da web: HTML5
              Canvas e Three.js para gráficos em tempo real, JavaScript para a
              lógica e a física, e APIs públicas como a PokéAPI para conteúdo.
              O resultado são jogos fluidos que funcionam em Chrome, Firefox,
              Safari e Edge — tanto no computador quanto no celular.
            </p>
            <p>
              O catálogo hoje tem {games.length} jogos: {emLista(games.map((g) => g.title))}.
              Tem xadrez completo contra um motor de IA em três níveis, o jogo da
              cobrinha com dificuldades que mudam as regras, um jogo da memória com
              bandas de rock, o Pong da Atari, Catan em 3D contra três adversários
              e um Super Trunfo de Pokémon. Novos títulos entram com frequência.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
