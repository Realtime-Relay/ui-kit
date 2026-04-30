import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { PresenceDemo } from "./pages/PresenceDemo";
import { ProgressBarDemo } from "./pages/ProgressBarDemo";
import { GaugeDemo } from "./pages/GaugeDemo";
import { StatCardDemo } from "./pages/StatCardDemo";
import { StateTimelineDemo } from "./pages/StateTimelineDemo";
import { TimeSeriesDemo } from "./pages/TimeSeriesDemo";
import { StreamsDemo } from "./pages/StreamsDemo";
import { TestGauges } from "./pages/TestGauges";
import { TestProgressBar } from "./pages/TestProgressBar";
import { TestStatCards } from "./pages/TestStatCards";
import { TestStateTimeline } from "./pages/TestStateTimeline";
import { TestTimeSeries } from "./pages/TestTimeSeries";
import { useConfig } from "./hooks/useConfig";
import "./App.css";

export type Page =
  | "dashboard"
  | "settings"
  | "presence"
  | "progressbar"
  | "gauges"
  | "statcards"
  | "timelines"
  | "timeseries"
  | "streams";

/** Hash-based test routes for Playwright (no SDK needed) */
function useTestRoute(): string | null {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (hash === "#/test-gauges") return "test-gauges";
  if (hash === "#/test-progress") return "test-progress";
  if (hash === "#/test-statcards") return "test-statcards";
  if (hash === "#/test-timelines") return "test-timelines";
  if (hash === "#/test-timeseries") return "test-timeseries";
  return null;
}

export function App() {
  const testRoute = useTestRoute();
  const [page, setPage] = useState<Page>("presence");
  const { config, saveConfig, isConfigured } = useConfig();

  // Render test pages directly — no sidebar, no SDK
  if (testRoute === "test-gauges") return <TestGauges />;
  if (testRoute === "test-progress") return <TestProgressBar />;
  if (testRoute === "test-statcards") return <TestStatCards />;
  if (testRoute === "test-timelines") return <TestStateTimeline />;
  if (testRoute === "test-timeseries") return <TestTimeSeries />;

  return (
    <>
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        isConfigured={isConfigured}
      />
      <main className="app-content">
        {page === "dashboard" && (
          <Dashboard
            config={config}
            onGoToSettings={() => setPage("settings")}
          />
        )}
        {page === "settings" && (
          <Settings config={config} onSave={saveConfig} />
        )}
        {page === "presence" && <PresenceDemo />}
        {page === "progressbar" && <ProgressBarDemo />}
        {page === "gauges" && <GaugeDemo />}
        {page === "statcards" && <StatCardDemo />}
        {page === "timelines" && <StateTimelineDemo />}
        {page === "timeseries" && <TimeSeriesDemo />}
        {page === "streams" && <StreamsDemo />}
      </main>
    </>
  );
}
