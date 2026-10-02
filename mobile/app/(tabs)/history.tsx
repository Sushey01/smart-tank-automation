import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHistory, getHistorySeries } from '../../src/api/telemetry';
import { Sparkline } from '../../src/components/Sparkline';
import { Card, EmptyState, ErrorState, Screen, Skeleton, chipStyle } from '../../src/components/States';
import { errorMessage, formatNumber, formatWhen } from '../../src/lib/format';
import { useTheme } from '../../src/theme';

const poll = { refetchInterval: 5000 } as const;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState<'minute' | 'hour'>('minute');
  const from = bucket === 'minute'
    ? new Date(Date.now() - 60 * 60 * 1000).toISOString()
    : new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const list = useQuery({
    queryKey: ['history', page],
    queryFn: () => getHistory({ page, limit: 20 }),
    ...poll,
  });
  const series = useQuery({
    queryKey: ['history-series', bucket],
    queryFn: () => getHistorySeries({ bucket, from }),
    ...poll,
  });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.limit ?? 20)));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.filters}>
          {(['minute', 'hour'] as const).map((item) => (
            <Pressable key={item} onPress={() => setBucket(item)} style={[styles.chip, chipStyle(colors, bucket === item)]}>
              <Text style={{ color: bucket === item ? '#ffffff' : colors.ink, fontWeight: '600' }}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <Text style={[styles.heading, { color: colors.ink }]}>Level</Text>
          {series.isLoading && <Skeleton height={72} />}
          {series.isError && <ErrorState message={errorMessage(series.error)} onRetry={() => { void series.refetch(); }} />}
          {series.data && (
            <Sparkline
              points={series.data.points}
              label={bucket === 'minute' ? 'Water level over the last hour' : 'Water level over the last six hours'}
            />
          )}
        </Card>
        {list.isLoading && <Skeleton height={160} />}
        {list.isError && <ErrorState message={errorMessage(list.error)} onRetry={() => { void list.refetch(); }} />}
        {list.data && list.data.items.length === 0 && (
          <EmptyState title="No readings yet" body="Start the simulator so HOME_HUB_01 publishes a tank document." />
        )}
        {list.data && list.data.items.length > 0 && (
          <Card>
            {list.data.items.map((item) => (
              <View key={item._id ?? item.timestamp} style={[styles.row, { borderColor: colors.border }]}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>
                  {formatNumber(item.telemetry.water_tank.ultrasonic_depth_pct, 1)}% · {formatNumber(item.telemetry.water_tank.volume_litres, 0)} L
                </Text>
                <Text style={{ color: colors.inkMuted, fontSize: 12 }}>
                  {formatWhen(item.timestamp)} · valve {item.telemetry.actuator_states.inlet_valve} · pump {item.telemetry.actuator_states.booster_pump}
                </Text>
              </View>
            ))}
            <View style={styles.pager}>
              <Pressable disabled={page <= 1} onPress={() => setPage((current) => current - 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}>
                <Text style={{ color: colors.ink }}>Previous</Text>
              </Pressable>
              <Text style={{ color: colors.inkMuted }}>Page {page} of {pages}</Text>
              <Pressable disabled={page >= pages} onPress={() => setPage((current) => current + 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page >= pages ? 0.4 : 1 }]}>
                <Text style={{ color: colors.ink }}>Next</Text>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  filters: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  heading: { fontSize: 17, fontWeight: '600' },
  row: { gap: 4, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
