// Dados estruturados (schema.org) para o Google entender o que é a página:
// um site de jogos, um jogo, o caminho até ele. O `<` escapado impede que um
// texto do catálogo feche a tag <script> antes da hora.

export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
