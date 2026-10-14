/**
 * Entrada do tutorial para os jogos HTML avulsos (public/games): vira
 * public/games/tutorial.js e expõe window.TutorialJogo.
 */
import { Tutorial, ponto } from './tutorial';

(window as unknown as { TutorialJogo: unknown }).TutorialJogo = { Tutorial, ponto };
