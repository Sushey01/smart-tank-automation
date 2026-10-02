import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAlerts } from '../../src/api/telemetry';
import { Badge, Card, EmptyState, ErrorState, Screen, Skeleton, chipStyle } from '../../src/components/States';
import { errorMessage, formatNumber, formatWhen, reasonLabel } from '../../src/lib/format';
import { useTheme } from '../../src/theme';
import { ALERT_REASONS } from '../../src/types';

const poll = { refetchInterval: 5000 } as const;

export default function AlertsScreen() {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const alerts = useQuery({
    queryKey: ['alerts', reason, page],
    queryFn: () => getAlerts({ page, limit: 20, reason: reason || undefined }),
    ...poll,
  });
  const pages = Math.max(1, Math.ceil((alerts.data?.total ?? 0) / (alerts.data?.limit ?? 20)));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad}>
        <View style={styles.filters}>
          <Pressable onPress={() => { setReason(''); setPage(1); }} style={[styles.chip, chipStyle(colors, reason === '')]}>
            <Text style={{ color: reason === '' ? '#ffffff' : colors.ink, fontWeight: '600' }}>All</Text>
          </Pressable>
          {ALERT_REASONS.map((item) => (
            <Pressable key={item} onPress={() => { setReason(item); setPage(1); }} style={[styles.chip, chipStyle(colors, reason === item)]}>
              <Text style={{ color: reason === item ? '#ffffff' : colors.ink, fontWeight: '600' }}>{reasonLabel(item)}</Text>
            </Pressable>
          ))}
        </View>
        {alerts.isLoading && <Skeleton height={160} />}
        {alerts.isError && <ErrorState message={errorMessage(alerts.error)} onRetry={() => { void alerts.refetch(); }} />}
        {alerts.data && alerts.data.items.length === 0 && (
          <EmptyState title="No overflow or dry-run alerts" body="The list fills when the high float is at or above 85%, or the low float is at or below 25%." />
        )}
        {alerts.data && alerts.data.items.length > 0 && (
          <Card>
            {alerts.data.items.map((item) => (
              <View key={item._id ?? item.timestamp} style={[styles.row, { borderColor: colors.border }]}>
                <Badge label={item.alert_reasons.map(reasonLabel).join(', ')} tone="danger" />
                <Text style={{ color: colors.ink }}>{formatNumber(item.telemetry.water_tank.ultrasonic_depth_pct, 1)}% · {formatNumber(item.telemetry.water_tank.volume_litres, 0)} L</Text>
                <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{formatWhen(item.timestamp)}</Text>
              </View>
            ))}
            <Pager page={page} pages={pages} onPage={setPage} />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pager}>
      <Pressable disabled={page <= 1} onPress={() => onPage(page - 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page <= 1 ? 0.4 : 1 }]}>
        <Text style={{ color: colors.ink }}>Previous</Text>
      </Pressable>
      <Text style={{ color: colors.inkMuted }}>Page {page} of {pages}</Text>
      <Pressable disabled={page >= pages} onPress={() => onPage(page + 1)} style={[styles.pageButton, { borderColor: colors.border, opacity: page >= pages ? 0.4 : 1 }]}>
        <Text style={{ color: colors.ink }}>Next</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12, paddingBottom: 32 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  row: { gap: 6, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  pageButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
