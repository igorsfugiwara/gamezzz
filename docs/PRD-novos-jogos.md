# PRD — Três jogos novos para o gamezzz one

**Autor:** Igor Fugiwara · **Data:** 18/09/2026 · **Status:** em implementação

Especifica três jogos novos para a plataforma: **Snake**, **Memória (bandas de
rock)** e **Xadrez com motor de IA**. Cada um é entregue e publicado
separadamente, na ordem deste documento.

---

## 1. Contexto e restrições

A plataforma já tem Pong (interno), Catan e PokéTrunfo (externos). Os três jogos
novos seguem o padrão do Pong: **um arquivo HTML autocontido** em
`public/games/`, registrado em `src/data/games.ts` com `embedType:
'iframe-internal'`.

Restrições que valem para os três:

| Restrição | Porquê |
|---|---|
| **Um arquivo `.html` só**, com CSS e JS embutidos | É como o Pong já funciona; sem build, sem bundler, sem dependência externa |
| **Zero dependência de rede** (fora a fonte do Google) | O jogo precisa rodar dentro do iframe mesmo se qualquer CDN cair |
| **Cabe em 16:9** | `GameFrame` usa `aspect-ratio: 16/9`; o jogo não pode exigir altura maior |
| **Funciona em tela cheia** | O botão "Tela Cheia" chama `requestFullscreen()` no próprio iframe |
| **Teclado e toque** | Metade do tráfego é celular; nenhum jogo pode depender só de teclado |
| **Sem `localStorage` obrigatório** | Iframe de terceiro pode ter storage bloqueado; usar sempre com `try/catch` e funcionar sem |
| **Português** | Toda a interface da plataforma é em pt-BR |
| **Estética retrô-arcade** | Fonte `Press Start 2P`, fundo escuro, glow neon — coerente com o Pong |

### Definição de pronto (vale para os três)

- [ ] Roda em 1280×720 dentro do iframe, sem barra de rolagem
- [ ] Roda em 390×844 (celular retrato), com controles de toque
- [ ] Nenhum erro no console
- [ ] Partida completa possível do início ao fim, incluindo a tela de fim de jogo
- [ ] Reinício sem recarregar a página
- [ ] Registrado em `games.ts` com thumbnail
- [ ] `npm run build` passa

---

## 2. Snake

### 2.1 Objetivo

O jogo da cobrinha clássico, com **três dificuldades** que mudam de verdade a
forma de jogar — não só a velocidade.

### 2.2 Regras

Grade de **24 × 18 células** (4:3, que centraliza bem no 16:9). A cobra começa
com 3 segmentos no centro, andando para a direita. Cada fruta comida adiciona
1 segmento e 10 pontos, multiplicados pelo fator da dificuldade.

Morte: colidir com o próprio corpo, ou com a parede (quando a dificuldade tem
parede sólida).

### 2.3 As três dificuldades

| | **Fácil** | **Médio** | **Difícil** |
|---|---|---|---|
| Velocidade inicial | 8 passos/s | 11 passos/s | 14 passos/s |
| Aceleração | nenhuma | +0,2/s a cada 5 frutas | +0,3/s a cada 3 frutas |
| Velocidade máxima | 8 | 16 | 22 |
| Paredes | **atravessa** (sai de um lado, entra no outro) | sólidas | sólidas |
| Obstáculos | nenhum | nenhum | **blocos fixos**, 4 no mapa |
| Multiplicador | ×1 | ×2 | ×3 |

A diferença entre Fácil e Médio é conceitual (atravessar parede vs. morrer nela),
não só numérica — é o que justifica três modos em vez de três velocidades.

### 2.4 Controles

- **Teclado:** setas ou WASD. `Espaço` pausa. `Enter` reinicia no fim.
- **Toque:** deslizar (swipe) na direção desejada, em qualquer ponto da tela.
- **Trava de curva:** a cobra não pode inverter 180° em um passo. A direção é
  aplicada no tique seguinte, e entradas no mesmo tique entram numa fila de até
  2 — sem isso, um giro rápido em L faz a cobra comer o próprio pescoço, que é o
  bug clássico de toda implementação ingênua.

### 2.5 Interface

Tela inicial com as três dificuldades. Durante a partida: pontuação, recorde
(por dificuldade, em `localStorage` com fallback) e velocidade atual. Tela de
fim com pontuação, recorde batido (se for o caso) e botão de jogar de novo.

---

## 3. Memória — Bandas de Rock

### 3.1 Objetivo

Jogo da memória com **cartas animadas** e tema de bandas de rock, onde o tema é
conteúdo de verdade — cada par revela uma banda e o ano de formação.

### 3.2 Conteúdo

18 bandas, desenhadas em **SVG inline** (nada de logotipo real: são marcas
registradas, e o jogo precisa rodar sem rede). Cada carta é um emblema
geométrico com a paleta e a inicial da banda, mais o nome e o ano.

O tema serve ao jogo: ao formar um par, a carta mostra o nome e o ano de
formação da banda, e o rodapé exibe uma linha sobre ela.

### 3.3 Modos

| Modo | Grade | Pares | Tempo alvo |
|---|---|---|---|
| Ensaio | 4 × 3 | 6 | — |
| Show | 4 × 4 | 8 | 60 s |
| Turnê | 6 × 4 | 12 | 100 s |

Sem contagem regressiva obrigatória: o tempo alvo vale para a classificação
final (Roadie / Musicista / Headliner), não para perder.

### 3.4 Animação das cartas

O ponto central do pedido: **cartas animadas**.

- **Virar:** `transform: rotateY(180deg)` com `transform-style: preserve-3d` e
  duas faces em `backface-visibility: hidden`. 420 ms, `cubic-bezier(.2,.8,.2,1)`.
- **Par certo:** pulso de escala + brilho na cor da banda, e a carta assenta em
  estado "conquistada" com leve elevação.
- **Par errado:** tremor horizontal curto (180 ms) antes de desvirar.
- **Entrada:** as cartas caem em cascata escalonada (40 ms por carta) no início.
- **Vitória:** as cartas conquistadas fazem uma onda.

Tudo respeitando `prefers-reduced-motion`: com movimento reduzido, as cartas
trocam de face sem rotação e sem tremor.

### 3.5 Regras de interação

- No máximo 2 cartas viradas por vez; cliques extras são ignorados durante a
  animação (trava por estado, não por `setTimeout`)
- Par errado desvira após 700 ms
- Contador de jogadas e de pares
- Fim: pares, jogadas, tempo e classificação

---

## 4. Xadrez com motor de IA

O maior dos três. É o único com regra de negócio complexa o bastante para
merecer separação entre **regras** e **motor**.

### 4.1 Objetivo

Xadrez completo para partida solo contra a máquina, com três níveis, **regras
oficiais inteiras** — incluindo as que quase toda implementação amadora pula.

### 4.2 Regras — escopo completo

Obrigatório, sem exceção:

- Movimento de todas as peças
- **Roque** dos dois lados, com as cinco condições: rei e torre nunca movidos,
  casas vazias entre eles, rei não está em xeque, não passa por casa atacada,
  não termina em xeque
- **En passant**, válido apenas no lance imediatamente seguinte
- **Promoção** de peão, com escolha entre dama, torre, bispo e cavalo
- **Xeque**, **xeque-mate**, **afogamento** (empate)
- **Empate por material insuficiente** (R×R, R+B×R, R+C×R, R+B×R+B mesma cor)
- **Regra dos 50 lances**
- **Repetição tripla** (por posição, incluindo direitos de roque e alvo de en passant)

> Um lance só é legal se, depois de executado, **o próprio rei não estiver
> atacado**. É a regra que a implementação faz por simulação: aplica o lance num
> tabuleiro clonado e testa. Sem isso, "peça cravada" não funciona.

### 4.3 Motor

**Busca:** minimax com poda alfa-beta, aprofundamento iterativo e ordenação de
lances (capturas primeiro, por MVV-LVA). Busca de quiescência nas capturas para
não parar a avaliação no meio de uma troca — sem ela o motor tem "efeito
horizonte" e entrega peça.

**Avaliação:**

| Componente | Peso |
|---|---|
| Material | ♙100 ♘320 ♗330 ♖500 ♕900 |
| Tabelas peça-casa | posicional, uma por tipo, espelhada por cor |
| Par de bispos | +30 |
| Mobilidade | +2 por lance legal |
| Estrutura de peões | dobrado −18, isolado −16 |
| Rei no fim de jogo | tabela própria, ativada quando material < limiar |

**Níveis:**

| Nível | Profundidade | Quiescência | Ruído |
|---|---|---|---|
| Iniciante | 2 | não | escolhe entre os 3 melhores, aleatório |
| Clube | 3 | sim | melhor lance, empates aleatórios |
| Mestre | 4 (+2 na quiescência) | sim | sempre o melhor |

**Desempenho:** o motor roda no mesmo thread da interface. Para a página não
travar, a busca é fatiada com `setTimeout(0)` entre os lances da raiz, com um
teto de tempo por jogada (1,5 s no Mestre). A interface mostra "pensando…".

### 4.4 Interface

Tabuleiro 8×8 responsivo, coordenadas, peças em **Unicode** (♔♕♖♗♘♙) — nada de
imagem externa. Mais:

- Clique na peça → casas legais marcadas (ponto para casa vazia, anel para captura)
- Último lance destacado; rei em xeque em vermelho
- Histórico em notação algébrica (SAN), com desambiguação correta
- Peças capturadas por cor, com saldo de material
- **Desfazer** (volta o lance do humano e o da máquina)
- Escolha de cor no início
- Modal de promoção
- Fim de jogo: mate, afogamento, 50 lances, repetição ou material insuficiente

### 4.5 Arquitetura interna

Ainda que num arquivo só, três camadas separadas:

```
regras   — tabuleiro, geração de lances, legalidade, SAN, estado de fim
motor    — avaliação, busca, escolha de lance
interface— render, entrada, animação, histórico
```

A interface nunca calcula regra, e o motor nunca toca no DOM.

### 4.6 Testes

Xadrez é o único dos três com armadilha silenciosa: um bug de geração de lances
não aparece na tela, só faz o motor jogar errado. Por isso a geração é conferida
por **perft** (contagem de nós por profundidade) contra valores publicados:

| Posição | d1 | d2 | d3 |
|---|---|---|---|
| Inicial | 20 | 400 | 8.902 |
| Kiwipete | 48 | 2.039 | 97.862 |

Bater esses números é a prova de que roque, en passant, promoção e cravada estão
todos corretos.

---

## 5. Ordem de entrega

1. **Snake** — menor risco, valida o fluxo de publicação
2. **Memória** — peso na animação
3. **Xadrez** — maior, com perft antes de publicar

Cada um: implementar → testar no navegador (desktop e celular) → registrar em
`games.ts` → `npm run build` → publicar.
