import type { CSSProperties, ReactNode } from 'react'

/** A single shimmering placeholder block. */
export function Skeleton({ w = '100%', h = 16, r = 8, style }: {
  w?: number | string; h?: number | string; r?: number; style?: CSSProperties
}) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function Box({ h, children }: { h?: number; children?: ReactNode }) {
  return (
    <div style={{ background: 'var(--du-card)', border: '1px solid var(--du-border)', borderRadius: 14, boxShadow: 'var(--shadow)', padding: 20, height: h }}>
      {children}
    </div>
  )
}

/**
 * Page-shaped skeletons that roughly mirror each screen's real layout so the
 * load feels like the content arriving, not a spinner stalling.
 */
export function PageSkeleton({ variant }: { variant: 'dashboard' | 'grid' | 'list' | 'table' | 'panel' }) {
  if (variant === 'dashboard') {
    return (
      <div className="du-content">
        <div className="du-pad" style={{ padding: '20px 32px 0', marginBottom: 24 }}>
          <Skeleton w={170} h={26} />
          <Skeleton w={230} h={13} style={{ marginTop: 8 }} />
        </div>
        <div className="du-pad" style={{ padding: '0 32px', marginBottom: 24 }}>
          <Skeleton h={190} r={20} />
        </div>
        <div className="du-grid-2 du-pad" style={{ padding: '0 32px', gridTemplateColumns: '2fr 1.2fr', gap: 20, marginBottom: 20 }}>
          <Box h={230} />
          <Box h={230} />
        </div>
        <div className="du-grid-4 du-pad" style={{ padding: '0 32px 40px', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <Box key={i} h={120} />)}
        </div>
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className="du-content du-pad" style={{ padding: '24px 32px 40px' }}>
        <Skeleton w={200} h={26} />
        <Skeleton w={260} h={13} style={{ marginTop: 8, marginBottom: 24 }} />
        <div className="du-grid-2" style={{ gap: 22 }}>
          {Array.from({ length: 4 }).map((_, i) => <Box key={i} h={210} />)}
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="du-content du-pad" style={{ padding: '24px 32px 40px' }}>
        <Skeleton w={220} h={26} />
        <Skeleton w={280} h={13} style={{ marginTop: 8, marginBottom: 24 }} />
        <div className="du-grid-stats" style={{ gap: 14, marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => <Box key={i} h={78} />)}
        </div>
        <Box h={320} />
      </div>
    )
  }

  if (variant === 'panel') {
    return (
      <div className="du-content du-pad" style={{ padding: '24px 32px 40px', maxWidth: 760 }}>
        <Skeleton w={260} h={26} style={{ marginBottom: 20 }} />
        <Skeleton h={130} r={16} style={{ marginBottom: 16 }} />
        <Box h={150}>
          <Skeleton w={120} h={12} />
          <Skeleton h={12} style={{ marginTop: 14 }} />
          <Skeleton w="80%" h={12} style={{ marginTop: 8 }} />
        </Box>
      </div>
    )
  }

  // list
  return (
    <div className="du-content du-pad" style={{ padding: '24px 32px 40px', maxWidth: 760 }}>
      <Skeleton w={200} h={26} />
      <Skeleton w={240} h={13} style={{ marginTop: 8, marginBottom: 24 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => <Box key={i} h={70} />)}
      </div>
    </div>
  )
}

/** Friendly, branded empty state used where there's no data to show. */
export function EmptyState({ icon, title, message, action }: {
  icon: string; title: string; message?: string; action?: ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 18px',
          background: 'var(--primary-pale)', border: '1px solid var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 32, color: 'var(--du-primary)' }} />
        </div>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
        {message && <div style={{ fontSize: 14, color: 'var(--du-muted)', lineHeight: 1.6 }}>{message}</div>}
        {action && <div style={{ marginTop: 18 }}>{action}</div>}
      </div>
    </div>
  )
}
