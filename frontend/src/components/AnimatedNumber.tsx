import React, { useEffect, useState } from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";

type Props = {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  format?: (n: number) => string;
  testID?: string;
};

export default function AnimatedNumber({
  value,
  duration = 900,
  style,
  format = (n) => `${Math.round(n)}`,
  testID,
}: Props) {
  const anim = useSharedValue(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    anim.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, anim]);

  useAnimatedReaction(
    () => anim.value,
    (curr) => {
      runOnJS(setCurrent)(curr);
    },
  );

  return <Text style={style} testID={testID}>{format(current)}</Text>;
}
