import type { Metadata } from 'next';
import Link from 'next/link';
import { games } from '@/data/games';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Sobre',
  description:
    'Conheça o gamezzz one — plataforma de jogos gratuitos no navegador, sem download e sem cadastro. Quem faz, como os jogos são feitos e o que vem por aí.',
  alternates: { canonical: '/sobre' },
};

export default function SobrePage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Sobre o gamezzz one</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>O que é o gamezzz one?</h2>
          <p>
            gamezzz one é uma plataforma de entretenimento digital que oferece jogos
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
            Os jogos feitos aqui são arquivos únicos de HTML, CSS e JavaScript puro,
            com HTML5 Canvas para os gráficos em tempo real — o motor de xadrez, por
            exemplo, é escrito do zero, com busca minimax e poda alfa-beta. Essa abordagem garante compatibilidade máxima com qualquer
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
            como a PokéAPI, que fornece os atributos reais dos 151 Pokémon da
            primeira geração para o PokéTrunfo. Outros são hospedados externamente e incorporados via iframe,
            permitindo uma coleção diversificada de experiências de jogo.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Catálogo atual</h2>
          <p>
            A plataforma conta hoje com {games.length} jogos:
          </p>
          <ul className={styles.list}>
            {games.map((g) => (
              <li key={g.slug}>
                <Link href={`/jogos/${g.slug}`} className={styles.link}>
                  <strong>{g.title}</strong>
                </Link>{' '}
                — {g.description}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Próximos lançamentos</h2>
          <p>
            O catálogo está em constante expansão. Os próximos jogos planejados incluem:
          </p>
          <ul className={styles.list}>
            <li>Tetris — o clássico puzzle de blocos em HTML5 Canvas</li>
            <li>Breakout — o arcade de destruição de blocos da Atari</li>
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
