import type { MetadataRoute } from 'next';
import { games } from '@/data/games';
import { absoluteUrl } from '@/lib/site';

// Gerado a cada build a partir do catálogo: jogo novo em games.ts entra no
// sitemap sozinho. Sem `lastModified` de propósito — uma data que muda a cada
// deploy, sem o conteúdo mudar, ensina o Google a ignorar o campo.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    ...games.map((game) => ({
      url: absoluteUrl(`/jogos/${game.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    { url: absoluteUrl('/sobre'), changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/privacidade'), changeFrequency: 'yearly', priority: 0.2 },
  ];
}
