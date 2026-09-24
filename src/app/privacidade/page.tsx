import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Como o gamezzz one trata seus dados: nenhum cadastro, recordes salvos só no seu navegador e anúncios do Google AdSense com consentimento.',
  alternates: { canonical: '/privacidade' },
};

export default function PrivacidadePage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Política de Privacidade</h1>
        <p className={styles.date}>Vigência: setembro de 2026</p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Introdução</h2>
          <p>
            Esta Política de Privacidade descreve como o gamezzz one trata as informações
            dos usuários que acessam a plataforma. Nossa postura é clara: não coletamos,
            armazenamos nem comercializamos dados pessoais de nossos visitantes.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Google AdSense e Cookies de Publicidade</h2>
          <p>
            O gamezzz one utiliza o Google AdSense para exibir anúncios. O Google, como
            fornecedor terceirizado, usa cookies para exibir anúncios com base nas visitas
            anteriores do usuário a este e a outros sites. O uso de cookies de publicidade
            pelo Google permite que ele e seus parceiros exibam anúncios aos nossos
            usuários com base na visita deles ao nosso site e/ou a outros sites na
            Internet.
          </p>
          <p>
            Os cookies do AdSense são utilizados apenas para fins de publicidade e
            personalização de anúncios, em conformidade com as políticas do Google. Nenhum
            dado pessoal identificável é coletado por meio desses cookies pelo gamezzz one.
            Para saber como o Google usa as informações de sites parceiros, veja{' '}
            <a
              href="https://policies.google.com/technologies/partner-sites"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              policies.google.com/technologies/partner-sites
            </a>
            .
          </p>
          <p>
            Na primeira visita, uma mensagem de consentimento do próprio Google pergunta
            se você aceita anúncios personalizados. Recusar não impede de jogar: os
            anúncios continuam aparecendo, mas sem usar seu histórico de navegação.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Recordes salvos no seu navegador</h2>
          <p>
            Alguns jogos, como o Snake, guardam seus recordes no
            armazenamento local do navegador (localStorage). Essa informação fica só no
            seu aparelho, nunca é enviada a nós e some quando você limpa os dados do site.
            Se o navegador bloquear esse armazenamento, os jogos continuam funcionando —
            só não lembram o recorde.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Dados Pessoais</h2>
          <p>
            O gamezzz one não coleta, processa nem armazena nenhum dado pessoal dos
            usuários. Não há formulários de cadastro, login, comentários ou qualquer outra
            funcionalidade que exija a inserção de informações pessoais. Para utilizar a
            plataforma, o usuário não precisa fornecer nenhum dado.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Como Desativar Anúncios Personalizados</h2>
          <p>
            Os usuários podem optar por não receber anúncios personalizados visitando as
            Configurações de anúncios do Google em{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              google.com/settings/ads
            </a>
            . Alternativamente, os usuários podem desativar o uso de cookies de terceiros
            acessando as configurações do navegador de sua preferência ou visitando{' '}
            <a
              href="https://www.aboutads.info/choices/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              aboutads.info/choices
            </a>
            .
          </p>
          <p>
            Após desativar anúncios personalizados, você ainda poderá ver anúncios no
            gamezzz one, porém eles não serão baseados nos seus interesses ou histórico de
            navegação.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cookies Essenciais</h2>
          <p>
            Além dos cookies do AdSense, o gamezzz one pode utilizar cookies técnicos
            essenciais para o funcionamento do site (como preferências de sessão). Esses
            cookies não coletam informações pessoais e são estritamente necessários para
            a operação da plataforma.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Links Externos</h2>
          <p>
            O gamezzz one pode conter links para sites externos, como jogos incorporados
            via iframe. Esta política de privacidade aplica-se exclusivamente ao Igor
            Games. Não nos responsabilizamos pelas práticas de privacidade de sites
            terceiros.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Seus Direitos (LGPD)</h2>
          <p>
            A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante a você o direito
            de saber quais dados são tratados, pedir correção ou exclusão e revogar
            consentimentos. Como o gamezzz one não guarda dados pessoais nos próprios
            servidores, os dados relevantes são os cookies de publicidade do Google, que
            você controla pelas configurações de anúncios acima ou limpando os cookies do
            navegador. Qualquer pedido pode ser feito pelo e-mail no fim desta página.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Alterações nesta Política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. Quaisquer alterações
            significativas serão refletidas na data de vigência no topo desta página.
            Recomendamos que os usuários revisitem esta página ocasionalmente.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contato</h2>
          <p>
            Para dúvidas sobre esta política de privacidade, entre em contato pelo e-mail{' '}
            <a href="mailto:igorsf.dev@gmail.com" className={styles.link}>
              igorsf.dev@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
