import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { View } from "react-native";

type Props = {
  data: number[];
  width: number;
  height: number;
  color: string;
  fillOpacity?: number;
  strokeWidth?: number;
};

/** Tiny SVG sparkline (curved line + soft area fill). No animation — used as ambient background. */
export default function Sparkline({
  data,
  width,
  height,
  color,
  fillOpacity = 0.18,
  strokeWidth = 2,
}: Props) {
  if (!data.length) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);

  const pts = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - strokeWidth * 2) - strokeWidth,
  }));

  // Smooth quadratic curve
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const mx = (prev.x + curr.x) / 2;
    d += ` Q ${mx.toFixed(2)} ${prev.y.toFixed(2)} ${mx.toFixed(2)} ${((prev.y + curr.y) / 2).toFixed(2)}`;
    d += ` T ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }
  const fillPath = `${d} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={fillOpacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={fillPath} fill="url(#spark)" />
      <Path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
