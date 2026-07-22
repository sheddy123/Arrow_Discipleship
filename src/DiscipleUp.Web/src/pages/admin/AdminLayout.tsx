import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LayoutGrid, Users, Award } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileHeader } from '@/components/MobileHeader'
import { MobileTabBar, type MobileTab } from '@/components/MobileTabBar'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

interface NavItem {
  id: string
  label: string
  icon: string
  path: string
}

const TAB_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  cohorts: { label: 'Cohorts', icon: LayoutGrid },
  users:   { label: 'Users',   icon: Users },
  badges:  { label: 'Badges',  icon: Award },
}

const ADMIN_NAV: NavItem[] = [
  { id: 'cohorts', label: 'Cohorts', icon: 'ti-layout-grid', path: '/admin/cohorts' },
  { id: 'users',   label: 'Users',   icon: 'ti-users',       path: '/admin/users'   },
  { id: 'badges',  label: 'Badges',  icon: 'ti-award',        path: '/admin/badges'  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user, clearAuth } = useAuthStore()

  const logout = useMutation({
    mutationFn: () => authApi.logout(localStorage.getItem('refreshToken') ?? ''),
    onSettled: () => { clearAuth(); navigate('/login') },
  })

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'A'

  function isActive(item: NavItem) {
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
    const tabs: MobileTab[] = ADMIN_NAV.map((item) => ({
      label: TAB_META[item.id].label,
      icon: TAB_META[item.id].icon,
      active: isActive(item),
      onClick: () => navigate(item.path),
    }))
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg)]">
        <MobileHeader
          name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
          initials={initials}
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
          Admin
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ADMIN_NAV.map(item => (
            <button key={item.id} onClick={() => navigate(item.path)} style={itemStyle(isActive(item))}>
              <i className={`ti ${item.icon}`} style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
              {item.label}
            </button>
          ))}
        </nav>

        <hr style={{ margin: '10px 20px', border: 'none', borderTop: '1px solid rgba(255,255,255,.08)' }} />

        <div className="du-section-label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--sidebar-text)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '12px 20px 6px' }}>
          Other
        </div>
        <nav style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={() => navigate('/mentor')} style={itemStyle(false)}>
            <i className="ti ti-users" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Mentor Dashboard
          </button>
          <button onClick={() => navigate('/dashboard')} style={itemStyle(false)}>
            <i className="ti ti-home" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Student view
          </button>
          <button onClick={() => logout.mutate()} style={itemStyle(false)}>
            <i className="ti ti-logout" style={{ fontSize: 18, flexShrink: 0, width: 20 }} />
            Sign out
          </button>
        </nav>

        <div style={{ marginTop: 'auto', padding: '12px 16px 4px' }}>
          <ThemeSwitcher tone="dark" className="w-full justify-between" />
        </div>

        <div className="du-user-footer" style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
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
              {user?.email ?? 'Admin'} · Admin
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
