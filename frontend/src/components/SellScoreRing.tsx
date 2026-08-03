import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../theme';

type Props = {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
};

export default function SellScoreRing({ score, size = 120, stroke = 10, label = 'Sell Score' }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c;

  const color =
    clamped >= 75 ? theme.color.lime
    : clamped >= 50 ? theme.color.warning
    : theme.color.error;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.color.surface2}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2}) scale(1 1)`}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject as any} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.score, { color }]}>{clamped}</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  label: { fontSize: 10, color: theme.color.textMuted, marginTop: 2, letterSpacing: 1.2, textTransform: 'uppercase' },
});
