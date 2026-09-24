import { ImageResponse } from 'next/og';
import { games } from '@/data/games';

// Imagem de compartilhamento da home e das páginas sem imagem própria. As
// páginas de jogo usam a miniatura do jogo, que já é 16:9.
export const alt = 'gamezzz one — jogos grátis no navegador';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'radial-gradient(circle at 80% 20%, #312e81 0%, #0a0a0a 55%)',
          color: '#ededed',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 40, color: '#818cf8', fontWeight: 700, letterSpacing: -1 }}>
          gamezzz one
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 24, letterSpacing: -2 }}>
          Jogos grátis direto no navegador
        </div>
        <div style={{ fontSize: 32, color: '#a1a1aa', marginTop: 32 }}>
          {games.map((g) => g.title).join(' · ')}
        </div>
        <div style={{ fontSize: 28, color: '#71717a', marginTop: 16 }}>
          Sem download · sem cadastro · no computador e no celular
        </div>
      </div>
    ),
    size,
  );
}
