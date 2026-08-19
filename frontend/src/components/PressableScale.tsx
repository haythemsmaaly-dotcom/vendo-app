import React, { useCallback } from "react";
import { Pressable, ViewStyle, StyleProp, PressableProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type Props = PressableProps & {
  scaleTo?: number;
  hapticStyle?: "light" | "medium" | "heavy" | "selection" | "none";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({
  scaleTo = 0.965,
  hapticStyle = "selection",
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...rest
}: Props) {
  const s = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: opacity.value,
  }));

  const handleIn = useCallback((e: any) => {
    s.value = withSpring(scaleTo, { damping: 18, stiffness: 300 });
    opacity.value = withTiming(0.85, { duration: 100 });
    onPressIn?.(e);
  }, [s, opacity, scaleTo, onPressIn]);

  const handleOut = useCallback((e: any) => {
    s.value = withSpring(1, { damping: 14, stiffness: 240 });
    opacity.value = withTiming(1, { duration: 140 });
    onPressOut?.(e);
  }, [s, opacity, onPressOut]);

  const handlePress = useCallback((e: any) => {
    if (hapticStyle !== "none") {
      try {
        if (hapticStyle === "selection") Haptics.selectionAsync();
        else if (hapticStyle === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (hapticStyle === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (hapticStyle === "heavy") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {}
    }
    onPress?.(e);
  }, [hapticStyle, onPress]);

  return (
    <AnimatedPressable
      onPressIn={handleIn}
      onPressOut={handleOut}
      onPress={handlePress}
      style={[style, animStyle] as any}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
