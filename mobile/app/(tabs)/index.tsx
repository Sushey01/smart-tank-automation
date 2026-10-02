import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHealth } from '../../src/api/health';
import { getAlerts, getAverages, getHistorySeries, getSummary } from '../../src/api/telemetry';
import { Sparkline } from '../../src/components/Sparkline';
import { Badge, Card, EmptyState, ErrorState, Screen, Skeleton } from '../../src/components/States';
import { TankGauge } from '../../src/components/TankGauge';
import { ageLabel, errorMessage, estimateHint, estimateText, formatNumber, formatWhen, reasonLabel } from '../../src/lib/format';
import { useTheme } from '../../src/theme';

const poll = { refetchInterval: 5000 } as const;

export default function HomeScreen() {
  const { colors } = useTheme();
  const summary = useQuery({ queryKey: ['summary'], queryFn: getSummary, ...poll });
  const alerts = useQuery({ queryKey: ['alerts', 'home'], queryFn: () => getAlerts({ limit: 5, page: 1 }), ...poll });
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, ...poll });
  const averages = useQuery({ queryKey: ['averages'], queryFn: getAverages, ...poll });
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const series = useQuery({
    queryKey: ['history-series', 'minute', 'hour'],
    queryFn: () => getHistorySeries({ bucket: 'minute', from: hourAgo }),
    ...poll,
  });

  if (summary.isLoading) {
    return (
      <Screen>
        <View style={styles.pad}>
          <Skeleton height={120} />
          <Skeleton height={240} />
        </View>
      </Screen>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <Screen>
        <View style={styles.pad}>
          <ErrorState message={errorMessage(summary.error)} onRetry={() => { void summary.refetch(); }} />
        </View>
      </Screen>
    );
  }

  const data = summary.data;
  const tank = data.reading?.telemetry.water_tank;
  const average = averages.data?.devices[0];
  const primary = health.data?.members.find((member) => member.isPrimary);
  const floats = data.reading?.telemetry.float_switches;
  const offline = data.status !== 'online' || !data.reading;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.meta, { color: colors.inkMuted }]}>
          Last seen {ageLabel(data.last_seen)} · RSSI {formatNumber(data.signal_rssi, 0)} dBm
        </Text>
        <View style={styles.grid}>
          <Stat label="Level" value={`${formatNumber(tank?.ultrasonic_depth_pct, 1)}%`} hint="ultrasonic depth" />
          <Stat label="Volume" value={`${formatNumber(tank?.volume_litres, 0)} L`} hint="of 2,000 L" />
          <Stat label="Trend" value={data.trend.charAt(0).toUpperCase() + data.trend.slice(1)} hint={`${formatNumber(data.rate_litres_per_hour, 1)} L/h over 15 min`} />
          <Stat label="Time estimate" value={estimateText(data.estimate.kind, data.estimate.minutes)} hint={estimateHint(data.estimate.kind)} />
        </View>
        <Card>
          <Text style={[styles.heading, { color: colors.ink }]}>Sensors</Text>
          <Text style={{ color: colors.inkMuted }}>HOME_HUB_01 · three sensors on this tank</Text>
          <SensorRow name="Ultrasonic level" detail="Measures how full the tank is" label={offline ? 'No signal' : 'Good condition'} tone={offline ? 'neutral' : 'ok'} />
          <SensorRow name="High float" detail="Trips at 85% to catch overflow" label={offline ? 'No signal' : floats?.high_level_overflow ? 'Overflow' : 'Good condition'} tone={offline ? 'neutral' : floats?.high_level_overflow ? 'danger' : 'ok'} />
          <SensorRow name="Low float" detail="Trips at 25% to catch a dry-run" label={offline ? 'No signal' : floats?.low_level_dry_run ? 'Dry-run' : 'Good condition'} tone={offline ? 'neutral' : floats?.low_level_dry_run ? 'warn' : 'ok'} />
        </Card>
        {!data.reading && (
          <EmptyState title="No readings yet" body="Start the simulator so HOME_HUB_01 publishes a tank document." />
        )}
        <TankGauge reading={data.reading} status={data.status} />
        <Card>
          <Text style={[styles.heading, { color: colors.ink }]}>Last hour</Text>
          <Text style={{ color: colors.inkMuted }}>
            Min {formatNumber(data.last_hour.min, 1)}% · max {formatNumber(data.last_hour.max, 1)}%
            {average ? ` · stored average ${formatNumber(average.avg_water_level, 1)}%` : ''}
          </Text>
          {series.isLoading && <Skeleton height={72} />}
          {series.isError && <ErrorState message={errorMessage(series.error)} onRetry={() => { void series.refetch(); }} />}
          {series.data && <Sparkline points={series.data.points} label="Water level over the last hour" />}
          <Text style={{ color: colors.inkMuted }}>
            Firmware {data.reading?.metadata.firmware ?? '—'} · distance {formatNumber(tank?.distance_cm, 1)} cm
          </Text>
          <Text style={[styles.heading, { color: colors.ink }]}>Recent alerts</Text>
          {alerts.data && alerts.data.items.length === 0 && (
            <Text style={{ color: colors.inkMuted }}>No overflow or dry-run documents yet.</Text>
          )}
          {(alerts.data?.items ?? []).map((item) => (
            <View key={item._id ?? item.timestamp} style={styles.alertRow}>
              <Badge label={item.alert_reasons.map(reasonLabel).join(', ')} tone="danger" />
              <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{formatWhen(item.timestamp)}</Text>
            </View>
          ))}
          <Text style={{ color: colors.inkMuted }}>Replica set {health.data?.set ?? '—'}</Text>
          {primary ? (
            <Text style={{ color: colors.ink }}>
              {primary.state} · {primary.name}
            </Text>
          ) : (
            <Text style={{ color: colors.inkMuted }}>Primary not reported yet.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.ink }]}>{value}</Text>
      <Text style={{ color: colors.inkFaint, fontSize: 12 }}>{hint}</Text>
    </View>
  );
}

function SensorRow({
  name,
  detail,
  label,
  tone,
}: {
  name: string;
  detail: string;
  label: string;
  tone: 'ok' | 'warn' | 'danger' | 'neutral';
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sensor, { backgroundColor: colors.muted }]}>
      <Text style={{ color: colors.ink, fontWeight: '600' }}>{name}</Text>
      <Text style={{ color: colors.inkMuted, fontSize: 13 }}>{detail}</Text>
      <Badge label={label} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  meta: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 20, padding: 14, gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heading: { fontSize: 17, fontWeight: '600' },
  sensor: { borderRadius: 16, padding: 12, gap: 6 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
