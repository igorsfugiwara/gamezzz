import GameCard from '@/components/GameCard/GameCard';
import AdBanner from '@/components/AdBanner/AdBanner';
import { games } from '@/data/games';
import styles from './page.module.scss';

export default function Home() {
  const featured = games.filter((g) => g.featured);

  return (
    <>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            Jogos Gratuitos Direto no Navegador
          </h1>
          <p className={styles.heroDesc}>
            Uma plataforma de jogos clássicos e originais — sem download,
            sem cadastro e sem custo. Jogue agora em qualquer dispositivo.
          </p>
          <span className={styles.badge}>{games.length} jogos disponíveis</span>
        </div>
      </section>

      <div className={styles.container}>
        <AdBanner />

        {/* JOGOS EM DESTAQUE */}
        <section id="jogos" className={styles.section}>
          <h2 className={styles.sectionTitle}>Jogos em Destaque</h2>
          <div className={styles.grid3}>
            {featured.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        </section>

        <AdBanner />

        {/* CATEGORIAS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Categorias</h2>
          <div className={styles.grid2}>
            <div className={styles.catCard}>
              <span className={styles.catIcon}>🕹️</span>
              <div>
                <h3>Clássico</h3>
                <p>Arcade dos anos 70 e 80 reimaginados para o browser</p>
              </div>
            </div>
            <div className={styles.catCard}>
              <span className={styles.catIcon}>♟️</span>
              <div>
                <h3>Estratégia</h3>
                <p>Tabuleiro e gestão de recursos com profundidade real</p>
              </div>
            </div>
            <div className={styles.catCard}>
              <span className={styles.catIcon}>🃏</span>
              <div>
                <h3>Cartas</h3>
                <p>Jogos de baralho e colecionáveis para todos os níveis</p>
              </div>
            </div>
            <div className={styles.catCard}>
              <span className={styles.catIcon}>⚡</span>
              <div>
                <h3>Ação</h3>
                <p>Reflexo e habilidade em partidas rápidas e viciantes</p>
              </div>
            </div>
          </div>
        </section>

        {/* POR QUE GAMEHUB BR */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Por que gamezzz?</h2>
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
          <h2 className={styles.sectionTitle}>Sobre o gamezzz</h2>
          <div className={styles.aboutText}>
            <p>
              gamezzz é uma plataforma de jogos gratuitos que roda direto
              no navegador, sem necessidade de download, instalação ou cadastro.
              O objetivo é entregar uma experiência de jogo acessível, rápida e
              divertida para qualquer pessoa com acesso à internet, em qualquer
              dispositivo.
            </p>
            <p>
              Os jogos são construídos com tecnologias modernas da web: HTML5
              Canvas para gráficos em tempo real, JavaScript puro para a lógica
              e física, e APIs públicas como a PokéAPI para conteúdo dinâmico.
              O resultado são jogos fluidos que funcionam em Chrome, Firefox,
              Safari e Edge — tanto no computador quanto no celular.
            </p>
            <p>
              A plataforma está em constante crescimento. Atualmente conta com
              Pong, o clássico arcade da Atari; Catan, o renomado jogo de
              tabuleiro de estratégia; e PokéTrunfo, uma versão digital do Super
              Trunfo com cartas de Pokémon. Novos títulos são adicionados
              regularmente — fique de olho nas atualizações!
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
