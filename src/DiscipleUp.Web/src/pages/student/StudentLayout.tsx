import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Home, Route, CalendarDays, Trophy, User, Baby, LayoutDashboard, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { studentsApi } from '@/api/students'
import { authApi } from '@/api/auth'
import { useMutation } from '@tanstack/react-query'
import { useStudentHub } from '@/hooks/useStudentHub'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileHeader, type HeaderMenuItem } from '@/components/MobileHeader'
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar'

const TAB_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard:   { label: 'Home',    icon: Home },
  journey:     { label: 'Journey', icon: Route },
  week:        { label: 'Week',    icon: CalendarDays },
  leaderboard: { label: 'Ranks',   icon: Trophy },
  profile:     { label: 'Profile', icon: User },
}

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',   icon: 'ti-home',           path: '/dashboard'   },
  { id: 'journey',     label: 'My Journey',  icon: 'ti-route',          path: '/journey'     },
  { id: 'week',        label: 'This Week',   icon: 'ti-calendar-event', path: '__week__'     },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'ti-trophy',         path: '/leaderboard' },
  { id: 'profile',     label: 'My Profile',  icon: 'ti-user',           path: '/profile'     },
]

export default function StudentLayout() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()
  const { user, clearAuth } = useAuthStore()

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => studentsApi.getDashboard().then(r => r.data),
    staleTime: 60_000,
  })

  // Real-time streak/badge toasts for students
  useStudentHub(user?.role === 'Student')

  const logout = useMutation({
    mutationFn: () => authApi.logout(localStorage.getItem('refreshToken') ?? ''),
    onSettled: () => { clearAuth(); navigate('/login') },
  })

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()
  const cohortInfo = dashboard?.cohort
    ? `${dashboard.cohort.name} · Day ${dashboard.cohort.dayOfJourney}`
    : 'Not enrolled'

  function handleNav(item: NavItem) {
    if (item.path === '__week__') {
      if (cohortInfo && dashboard?.cohort) {
        navigate(`/week/${dashboard.cohort.currentWeek}`, {
          state: { cohortId: dashboard.cohort.id },
        })
      } else {
        navigate('/journey')
      }
    } else {
      navigate(item.path)
    }
  }

  function isActive(item: NavItem) {
    if (item.path === '__week__') return location.pathname.startsWith('/week')
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  }

  if (isMobile) {
    const tabs: MobileTab[] = STUDENT_NAV.map((item) => ({
      label: TAB_META[item.id].label,
      icon: TAB_META[item.id].icon,
      active: isActive(item),
      onClick: () => handleNav(item),
    }))
    const menu: HeaderMenuItem[] = [
      ...(user?.role === 'Parent' ? [{ label: 'My Children', icon: Baby, onClick: () => navigate('/parent') }] : []),
      ...(user?.role === 'Admin' ? [{ label: 'Admin panel', icon: LayoutDashboard, onClick: () => navigate('/admin/cohorts') }] : []),
      ...(user?.role === 'Mentor' || user?.role === 'Admin' ? [{ label: 'Mentor Dashboard', icon: Users, onClick: () => navigate('/mentor') }] : []),
    ]
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
      {/* ── Sidebar ── */}
      <aside className="du-sidebar" style={{
        width: 240, minWidth: 240, background: 'var(--du-sidebar)',
        display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', letterSpacing: '-.3px' }}>
          Disciple<span style={{ color: 'var(--gold)' }}>Up</span>
        </div>

        {/* Student nav */}
        <div className="du-section-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '12px 20px 6px' }}>
          Student
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {STUDENT_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: isActive(item) ? 'var(--sidebar-active)' : 'transparent',
                color: isActive(item) ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              {item.label}
              {item.badge ? (
                <span style={{ marginLeft: 'auto', background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <hr style={{ margin: '10px 20px', border: 'none', borderTop: '1px solid rgba(255,255,255,.08)' }} />

        {/* Leadership nav */}
        <div className="du-section-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '12px 20px 6px' }}>
          Leadership
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {user?.role === 'Parent' && (
            <button
              onClick={() => navigate('/parent')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: location.pathname.startsWith('/parent') ? 'var(--sidebar-active)' : 'transparent',
                color: location.pathname.startsWith('/parent') ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <i className="ti ti-mood-kid" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              My Children
            </button>
          )}
          {user?.role === 'Admin' && (
            <button
              onClick={() => navigate('/admin/cohorts')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: location.pathname.startsWith('/admin') ? 'var(--sidebar-active)' : 'transparent',
                color: location.pathname.startsWith('/admin') ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <i className="ti ti-layout-dashboard" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              Admin panel
            </button>
          )}
          {(user?.role === 'Mentor' || user?.role === 'Admin') && (
            <button
              onClick={() => navigate('/mentor')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                background: location.pathname.startsWith('/mentor') ? 'var(--sidebar-active)' : 'transparent',
                color: location.pathname.startsWith('/mentor') ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
              }}
            >
              <i className="ti ti-users" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              Mentor Dashboard
            </button>
          )}
          <button
            onClick={() => logout.mutate()}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
              fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'var(--sidebar-text)',
            }}
          >
            <i className="ti ti-logout" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Sign out
          </button>
        </nav>

        {/* User info at bottom */}
        <div className="du-user-footer" style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary-mid), var(--du-primary))',
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
              {cohortInfo}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main scrollable area ── */}
      <main className="du-scroll" style={{ flex: 1, height: '100vh', overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)' }}>
        <div className="du-content"><Outlet /></div>
      </main>
    </div>
  )
}
