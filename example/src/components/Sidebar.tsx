interface SidebarProps {
  activePage: 'dashboard' | 'settings';
  onNavigate: (page: 'dashboard' | 'settings') => void;
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
      <div
        style={{
          padding: '24px 20px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>
          Relay<span style={{ color: '#3b82f6' }}>X</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          UI Kit Example
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        <NavItem
          label="Dashboard"
          active={activePage === 'dashboard'}
          onClick={() => onNavigate('dashboard')}
          icon="grid"
        />
        <NavItem
          label="Settings"
          active={activePage === 'settings'}
          onClick={() => onNavigate('settings')}
          icon="gear"
          badge={!isConfigured ? 'Setup required' : undefined}
        />
      </nav>

      {/* Connection status */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #1e293b',
          fontSize: 11,
          color: '#64748b',
        }}
      >
        {isConfigured ? (
          <span style={{ color: '#22c55e' }}>Ready to connect</span>
        ) : (
          <span style={{ color: '#f59e0b' }}>Not configured</span>
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
        padding: '10px 12px',
        border: 'none',
        borderRadius: 8,
        backgroundColor: active ? '#1e293b' : 'transparent',
        color: active ? '#fff' : '#94a3b8',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        marginBottom: 4,
        textAlign: 'left',
        transition: 'all 150ms ease',
      }}
    >
      <span style={{ fontSize: 16 }}>
        {icon === 'grid' ? '\u25A6' : '\u2699'}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span
          style={{
            fontSize: 10,
            backgroundColor: '#f59e0b',
            color: '#000',
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
