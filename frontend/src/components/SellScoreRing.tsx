import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { theme } from "../theme";
import AnimatedNumber from "./AnimatedNumber";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  duration?: number;
  delay?: number;
  showLabel?: boolean;
};

export default function SellScoreRing({
  score,
  size = 120,
  stroke = 10,
  label = "Sell Score",
  duration = 900,
  delay = 120,
  showLabel = true,
}: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const progress = useSharedValue(0);

  const color =
    clamped >= 75 ? theme.color.lime
    : clamped >= 50 ? theme.color.warning
    : theme.color.error;

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(clamped / 100, {
        duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [clamped, duration, delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.color.surface2}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeLinecap="round"
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject as any} pointerEvents="none">
        <View style={styles.center}>
          <AnimatedNumber
            value={clamped}
            duration={duration}
            style={[styles.score, { color, fontSize: Math.round(size * 0.28) }] as any}
          />
          {showLabel && <Text style={styles.label}>{label}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  score: {
    fontFamily: theme.font.displayBold,
    letterSpacing: -1,
  },
  label: {
    fontSize: 10,
    color: theme.color.textMuted,
    marginTop: 2,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontFamily: theme.font.textSemi,
  },
});
