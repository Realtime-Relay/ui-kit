import type { Page } from '../App';

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  isConfigured: boolean;
}

export function Sidebar({ activePage, onNavigate, isConfigured }: SidebarProps) {
  return (
    <aside
      style={{
        width: 240,
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
          Relay<span style={{ color: '#3b82f6' }}>X</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>UI Kit Example</div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Components
        </div>
        <NavItem label="Presence Indicator" active={activePage === 'presence'} onClick={() => onNavigate('presence')} icon="●" />
        <NavItem label="Progress Bar" active={activePage === 'progressbar'} onClick={() => onNavigate('progressbar')} icon="▬" />
        <NavItem label="Gauges" active={activePage === 'gauges'} onClick={() => onNavigate('gauges')} icon="◔" />

        <div style={{ fontSize: 10, fontWeight: 600, color: '#475569', padding: '16px 12px 4px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Full Dashboard
        </div>
        <NavItem label="Dashboard" active={activePage === 'dashboard'} onClick={() => onNavigate('dashboard')} icon="▦" badge={!isConfigured ? 'Setup' : undefined} />
        <NavItem label="Settings" active={activePage === 'settings'} onClick={() => onNavigate('settings')} icon="⚙" />
      </nav>

      {/* Status */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', fontSize: 11, color: '#64748b' }}>
        {isConfigured ? (
          <span style={{ color: '#22c55e' }}>SDK configured</span>
        ) : (
          <span style={{ color: '#f59e0b' }}>SDK not configured</span>
        )}
      </div>
    </aside>
  );
}

function NavItem({
  label,
  active,
  onClick,
  icon,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: active ? '#1e293b' : 'transparent',
        color: active ? '#fff' : '#94a3b8',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        marginBottom: 2,
        textAlign: 'left',
        transition: 'all 150ms ease',
      }}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 10, backgroundColor: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
          {badge}
        </span>
      )}
    </button>
  );
}
