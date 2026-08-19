import React, { useEffect } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";

type Props = {
  width?: number | `${number}%` | "auto";
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function Skeleton({ width = "100%", height = 16, radius = 8, style }: Props) {
  const tx = useSharedValue(-1);

  useEffect(() => {
    tx.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [tx]);

  const shimmer = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value * 200 }],
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, overflow: "hidden", backgroundColor: theme.color.surface },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ translateX: 0 }] },
          shimmer,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.06)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}
