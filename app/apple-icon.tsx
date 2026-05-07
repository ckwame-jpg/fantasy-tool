import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 30% 25%, hsl(262 70% 38%) 0%, hsl(252 70% 14%) 60%, hsl(248 80% 6%) 100%)',
        }}
      >
        <svg
          width="135"
          height="135"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: 'rotate(-28deg)' }}
        >
          <defs>
            <linearGradient id="ballFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(262 95% 80%)" />
              <stop offset="55%" stopColor="hsl(262 80% 58%)" />
              <stop offset="100%" stopColor="hsl(252 70% 32%)" />
            </linearGradient>
            <radialGradient id="ballShine" cx="32%" cy="32%" r="55%">
              <stop offset="0%" stopColor="hsl(262 100% 95%)" stopOpacity="0.65" />
              <stop offset="60%" stopColor="hsl(262 90% 80%)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          <path
            d="M 5 20 Q 20 3 35 20 Q 20 37 5 20 Z"
            fill="url(#ballFill)"
            stroke="hsl(262 80% 70%)"
            strokeWidth="0.6"
          />
          <path d="M 5 20 Q 20 3 35 20 Q 20 37 5 20 Z" fill="url(#ballShine)" />

          <line x1="13.5" y1="20" x2="26.5" y2="20" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="16" y1="17.5" x2="16" y2="22.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="18" y1="17.5" x2="18" y2="22.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="20" y1="17.5" x2="20" y2="22.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="22" y1="17.5" x2="22" y2="22.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="24" y1="17.5" x2="24" y2="22.5" stroke="white" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  )
}
