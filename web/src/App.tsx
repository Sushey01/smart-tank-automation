import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AlertsPage } from './pages/Alerts';
import { AnalyticsPage } from './pages/Analytics';
import { ClusterPage } from './pages/Cluster';
import { Dashboard } from './pages/Dashboard';
import { DevicesPage } from './pages/Devices';
import { TelemetryPage } from './pages/Telemetry';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="cluster" element={<ClusterPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
