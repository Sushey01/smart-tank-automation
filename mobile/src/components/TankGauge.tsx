import { StyleSheet, Text, View } from 'react-native';
import { formatNumber } from '../lib/format';
import type { DeviceStatus, SensorReading } from '../types';
import { useTheme } from '../theme';
import { Badge, Card } from './States';

export function TankGauge({ reading, status }: { reading: SensorReading | null; status: DeviceStatus }) {
  const { colors } = useTheme();
  const tank = reading?.telemetry.water_tank;
  const level = tank?.ultrasonic_depth_pct ?? 0;
  const clamped = Math.max(0, Math.min(100, level));
  const high = Boolean(reading?.telemetry.float_switches.high_level_overflow);
  const low = Boolean(reading?.telemetry.float_switches.low_level_dry_run);
  const valve = reading?.telemetry.actuator_states.inlet_valve ?? 'CLOSED';
  const pump = reading?.telemetry.actuator_states.booster_pump ?? 'EMERGENCY_STOP';

  return (
    <Card>
      <View style={styles.header}>
        <View>
          <Text style={[styles.mono, { color: colors.inkMuted }]}>HOME_HUB_01</Text>
          <Text style={[styles.title, { color: colors.ink }]}>Home tank</Text>
        </View>
        <Badge label={status === 'online' ? 'Online' : 'Offline'} tone={status === 'online' ? 'ok' : 'danger'} />
      </View>
      <View style={styles.row}>
        <View
          accessibilityLabel={`Home tank is ${formatNumber(level, 1)} percent full, about ${formatNumber(tank?.volume_litres, 0)} litres`}
          style={[styles.tank, { borderColor: colors.brandDark, backgroundColor: colors.muted }]}
        >
          <View style={[styles.fill, { height: `${clamped}%`, backgroundColor: colors.brandDark }]} />
          <View style={[styles.mark, { bottom: '85%', borderColor: colors.danger }]} />
          <View style={[styles.mark, { bottom: '25%', borderColor: colors.warn }]} />
          <Text style={styles.level}>{formatNumber(level, 1)}%</Text>
        </View>
        <View style={styles.facts}>
          <Text style={[styles.mono, { color: colors.ink }]}>
            {formatNumber(tank?.volume_litres, 0)} L
            <Text style={{ color: colors.inkFaint }}> of 2,000 L</Text>
          </Text>
          <Badge label={high ? 'High float: overflow' : 'High float: clear'} tone={high ? 'danger' : 'neutral'} />
          <Badge label={low ? 'Low float: dry-run' : 'Low float: clear'} tone={low ? 'warn' : 'neutral'} />
          <Badge label={`Inlet valve ${valve}`} />
          <Badge
            label={pump === 'EMERGENCY_STOP' ? 'Booster pump emergency stop' : 'Booster pump active'}
            tone={pump === 'EMERGENCY_STOP' ? 'danger' : 'ok'}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
  mono: { fontVariant: ['tabular-nums'], fontSize: 14 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  tank: {
    width: 108,
    height: 220,
    borderWidth: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%' },
  mark: {
    position: 'absolute',
    left: 6,
    right: 6,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  level: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    textAlign: 'center',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  facts: { flex: 1, gap: 8 },
});
