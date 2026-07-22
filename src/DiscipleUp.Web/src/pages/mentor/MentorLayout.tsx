import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { LayoutDashboard, ClipboardList, HeartHandshake, Megaphone, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { mentorsApi } from '@/api/mentors'
import { authApi } from '@/api/auth'
import { useMentorHub } from '@/hooks/useMentorHub'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileHeader, type HeaderMenuItem } from '@/components/MobileHeader'
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badgeKey?: 'pendingSubmissions' | 'pendingPrayerRequests'
}

const TAB_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard:     { label: 'Home',   icon: LayoutDashboard },
  review:        { label: 'Review', icon: ClipboardList },
  roster:        { label: 'People', icon: Users },
  prayer:        { label: 'Prayer', icon: HeartHandshake },
  announcements: { label: 'News',   icon: Megaphone },
}

const MENTOR_NAV: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     icon: 'ti-layout-dashboard', path: '/mentor' },
  { id: 'review',        label: 'Review Queue',  icon: 'ti-clipboard-check',  path: '/mentor/review',        badgeKey: 'pendingSubmissions' },
  { id: 'roster',        label: 'Students',      icon: 'ti-users',            path: '/mentor/roster' },
  { id: 'prayer',        label: 'Prayer Wall',   icon: 'ti-heart-handshake',  path: '/mentor/prayer',        badgeKey: 'pendingPrayerRequests' },
  { id: 'announcements', label: 'Announcements', icon: 'ti-speakerphone',     path: '/mentor/announcements' },
]

export default function MentorLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [searchParams] = useSearchParams()
  const { user, clearAuth } = useAuthStore()

  const { data: cohorts } = useQuery({
    queryKey: ['mentor-cohorts'],
    queryFn: () => mentorsApi.getCohorts().then(r => r.data),
  })

  const paramId = Number(searchParams.get('cohortId') ?? 0)
  const cohort = cohorts?.find(c => c.id === paramId) ?? cohorts?.[0]

  // Live prayer-request notifications keep the sidebar badges fresh
  useMentorHub(cohort?.id)

  const logout = useMutation({
    mutationFn: () => authApi.logout(localStorage.getItem('refreshToken') ?? ''),
    onSettled: () => { clearAuth(); navigate('/login') },
  })

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  function withCohort(path: string) {
    return cohort ? `${path}?cohortId=${cohort.id}` : path
  }

  function isActive(item: NavItem) {
    if (item.path === '/mentor') return location.pathname === '/mentor'
    return location.pathname.startsWith(item.path)
  }

  const itemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all .15s',
    background: active ? 'var(--sidebar-active)' : 'transparent',
    color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
  })

  if (isMobile) {
    const tabs: MobileTab[] = MENTOR_NAV.map((item) => ({
      label: TAB_META[item.id].label,
      icon: TAB_META[item.id].icon,
      active: isActive(item),
      onClick: () => navigate(withCohort(item.path)),
      badge: item.badgeKey && cohort ? cohort[item.badgeKey] : undefined,
    }))
    const menu: HeaderMenuItem[] = user?.role === 'Admin'
      ? [{ label: 'Admin panel', icon: LayoutDashboard, onClick: () => navigate('/admin/cohorts') }]
      : []
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg)]">
        <MobileHeader
          name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          initials={initials}
          items={menu}
          onSignOut={() => logout.mutate()}
        />
        <main className="flex-1 pb-[76px]"><Outlet /></main>
        <MobileTabBar tabs={tabs} />
      </div>
    )
  }

  return (
    <div className="du-shell" style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <aside className="du-sidebar" style={{
        width: 240, minWidth: 240, background: 'var(--du-sidebar)',
        display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 20px 20px', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-.3px' }}>
          Disciple<span style={{ color: 'var(--gold)' }}>Up</span>
        </div>

        <div className="du-section-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '12px 20px 6px' }}>
          Mentor
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MENTOR_NAV.map(item => {
            const badge = item.badgeKey && cohort ? cohort[item.badgeKey] : 0
            return (
              <button key={item.id} onClick={() => navigate(withCohort(item.path))} style={itemStyle(isActive(item))}>
                <i className={`ti ${item.icon}`} style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
                {item.label}
                {badge ? (
                  <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                    {badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <hr style={{ margin: '10px 20px', border: 'none', borderTop: '1px solid rgba(255,255,255,.08)' }} />

        <div className="du-section-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '12px 20px 6px' }}>
          Other
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={() => navigate('/dashboard')} style={itemStyle(false)}>
            <i className="ti ti-home" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Student view
          </button>
          {user?.role === 'Admin' && (
            <button onClick={() => navigate('/admin/cohorts')} style={itemStyle(false)}>
              <i className="ti ti-settings" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              Admin panel
            </button>
          )}
          <button onClick={() => logout.mutate()} style={itemStyle(false)}>
            <i className="ti ti-logout" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Sign out
          </button>
        </nav>

        <div className="du-user-footer" style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--gold), var(--coral))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff', fontFamily: 'Sora, sans-serif',
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--sidebar-text)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cohort?.name ?? 'No cohort'} · Mentor
            </div>
          </div>
        </div>
      </aside>

      <main className="du-scroll" style={{ flex: 1, height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)' }}>
        <div className="du-content"><Outlet /></div>
      </main>
    </div>
  )
}
