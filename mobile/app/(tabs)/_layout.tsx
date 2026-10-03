import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { getSmartAlerts, getSummary } from '../../src/api/telemetry';
import { SirenControl } from '../../src/components/SirenControl';
import { useTheme } from '../../src/theme';

const poll = { refetchInterval: 5000 } as const;

export default function TabsLayout() {
  const { colors } = useTheme();
  const summary = useQuery({
    queryKey: ['summary', 'siren'],
    queryFn: getSummary,
    ...poll,
  });
  const alerts = useQuery({
    queryKey: ['smart-alerts', 'siren'],
    queryFn: () => getSmartAlerts({ limit: 10 }),
    ...poll,
  });
  const levelAlertActive = Boolean(summary.data?.reading?.alert);
  const unreadLeakAlerts = Boolean(
    alerts.data?.items?.some(
      (a) => a.alert_type === 'ABNORMAL_WATER_USAGE' && a.status === 'unread'
    )
  );
  const alertActive = levelAlertActive || unreadLeakAlerts;

  return (
    <Tabs
      screenOptions={{
        headerRight: () => <SirenControl active={alertActive} />,
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.brandDark,
        tabBarInactiveTintColor: colors.inkFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="cluster" options={{ title: 'Cluster' }} />
    </Tabs>
  );
}
