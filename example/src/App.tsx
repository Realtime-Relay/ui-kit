import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { useConfig } from './hooks/useConfig';
import './App.css';

type Page = 'dashboard' | 'settings';

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const { config, saveConfig, isConfigured } = useConfig();

  return (
    <>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        isConfigured={isConfigured}
      />
      <main className="app-content">
        {page === 'dashboard' ? (
          <Dashboard config={config} onGoToSettings={() => setPage('settings')} />
        ) : (
          <Settings config={config} onSave={saveConfig} />
        )}
      </main>
    </>
  );
}
