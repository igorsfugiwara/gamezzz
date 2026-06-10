import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Sobre | gamezzz',
  description:
    'Conheça o gamezzz — plataforma de jogos gratuitos no navegador, sem download e sem cadastro.',
};

export default function SobrePage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Sobre o gamezzz</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>O que é o gamezzz?</h2>
          <p>
            gamezzz é uma plataforma de entretenimento digital que oferece jogos
            gratuitos diretamente no navegador. Sem downloads, sem instalações, sem
            cadastros — basta acessar e jogar. A plataforma foi criada com o objetivo
            de tornar jogos de qualidade acessíveis para todos, independentemente do
            dispositivo ou sistema operacional, funcionando em computadores, tablets
            e smartphones modernos.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tecnologia por trás dos jogos</h2>
          <p>
            Todos os jogos desenvolvidos internamente são criados com tecnologias
            nativas da web: HTML5 Canvas para renderização gráfica em tempo real,
            JavaScript puro para a lógica e física dos jogos, e CSS3 para estilização
            e animações. Essa abordagem garante compatibilidade máxima com qualquer
            navegador moderno — Chrome, Firefox, Safari e Edge — sem dependências
            externas ou plugins.
          </p>
          <p>
            A plataforma em si é construída com Next.js 14 usando o App Router,
            TypeScript para segurança de tipos, e SCSS Modules para estilos
            escopados por componente. O resultado é uma aplicação rápida com HTML
            estático pré-renderizado para melhor indexação em mecanismos de busca.
          </p>
          <p>
            Alguns títulos integram APIs públicas para enriquecer a experiência —
            como a PokéAPI, que fornece dados reais de mais de 900 Pokémon para o
            PokéTrunfo. Outros são hospedados externamente e incorporados via iframe,
            permitindo uma coleção diversificada de experiências de jogo.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Catálogo atual</h2>
          <p>
            A plataforma conta atualmente com três títulos:
          </p>
          <ul className={styles.list}>
            <li><strong>Pong</strong> — o clássico arcade da Atari de 1972, recriado em HTML5 Canvas com efeitos visuais modernos e suporte a touch</li>
            <li><strong>Catan</strong> — o renomado jogo de tabuleiro de estratégia com NPCs e sistema completo de negociação de recursos</li>
            <li><strong>PokéTrunfo</strong> — versão digital do Super Trunfo com mais de 900 Pokémon usando dados reais da PokéAPI</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Próximos lançamentos</h2>
          <p>
            O catálogo está em constante expansão. Os próximos jogos planejados incluem:
          </p>
          <ul className={styles.list}>
            <li>Tetris — o clássico puzzle de blocos em HTML5 Canvas</li>
            <li>Snake — o famoso jogo da cobrinha com modos de dificuldade</li>
            <li>Breakout — o arcade de destruição de blocos da Atari</li>
            <li>Jogo da Memória — cards temáticos com animações fluidas</li>
            <li>Xadrez — com motor de IA para partidas solo</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contato e sugestões</h2>
          <p>
            Para sugestões de jogos, relato de bugs ou qualquer outro contato, envie
            um e-mail para{' '}
            <a href="mailto:igorsf.dev@gmail.com" className={styles.link}>
              igorsf.dev@gmail.com
            </a>
            . Feedbacks são sempre bem-vindos e contribuem diretamente para o
            crescimento da plataforma.
          </p>
        </section>
      </div>
    </div>
  );
}
