import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { useTheme } from '../theme';

export function Sparkline({
  points,
  label,
}: {
  points: { avg: number | null }[];
  label: string;
}) {
  const { colors } = useTheme();
  const values = points.map((point) => point.avg).filter((value): value is number => value !== null);
  if (values.length === 0) {
    return <Text style={{ color: colors.inkFaint, fontSize: 12 }}>No trend points yet.</Text>;
  }
  const width = 320;
  const height = 72;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <View accessibilityLabel={label} style={styles.wrap}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline points={coords} fill="none" stroke={colors.brand} strokeWidth={2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: 72 },
});
