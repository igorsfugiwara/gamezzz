/**
 * Geometria do RODA (PRD 1): detecção de círculo por interseção de segmentos
 * do rastro + teste ponto-no-polígono. Sem DOM — testável.
 */
export interface Ponto { x: number; y: number }

/** Interseção dos segmentos ab e cd (exclusiva nas pontas), ou null. */
export function cruzamento(a: Ponto, b: Ponto, c: Ponto, d: Ponto): Ponto | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const den = r.x * s.y - r.y * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
  if (t <= 0 || t > 1 || u < 0 || u >= 1) return null;
  return { x: a.x + t * r.x, y: a.y + t * r.y };
}

/** Ray casting. */
export function pontoNoPoligono(p: Ponto, poli: Ponto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i], b = poli[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

export function areaPoligono(poli: Ponto[]): number {
  let s = 0;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) s += (poli[j].x + poli[i].x) * (poli[j].y - poli[i].y);
  return Math.abs(s / 2);
}

export interface Roda { poligono: Ponto[]; indice: number; area: number }

/**
 * A cabeça (último segmento do rastro) cruzou o próprio rastro?
 * Só olha do índice `desde` em diante — o que já virou roda não conta de novo.
 * `areaMinima` descarta voltinhas de tremida.
 */
export function detectarRoda(rastro: Ponto[], desde: number, areaMinima: number): Roda | null {
  const n = rastro.length;
  if (n < 4) return null;
  const a = rastro[n - 2], b = rastro[n - 1];
  for (let j = Math.max(0, desde); j < n - 3; j++) {
    const p = cruzamento(a, b, rastro[j], rastro[j + 1]);
    if (!p) continue;
    const poligono = [p, ...rastro.slice(j + 1, n - 1)];
    const area = areaPoligono(poligono);
    if (area < areaMinima) continue;
    return { poligono, indice: n - 1, area };
  }
  return null;
}

export const dist2 = (a: Ponto, b: Ponto) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
