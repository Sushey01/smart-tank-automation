import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AlertsPage } from './pages/Alerts';
import { ClusterPage } from './pages/Cluster';
import { Dashboard } from './pages/Dashboard';
import { HistoryPage } from './pages/History';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="cluster" element={<ClusterPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
