import { useEffect, useRef } from "react";
import {
  select,
  axisBottom,
  axisLeft,
  timeFormat,
  type ScaleLinear,
  type ScaleTime,
} from "d3";
import type { FontStyle } from "../../utils/types";

const identity = (px: number) => px;

interface XAxisProps {
  xScale: ScaleTime<number, number> | ScaleLinear<number, number>;
  height: number;
  style?: FontStyle;
  tickFormat?: (d: Date) => string;
  /** Proportional scaler created by the parent chart. Defaults to identity. */
  s?: (px: number) => number;
}

const defaultTickFormat = timeFormat("%H:%M:%S");

export function XAxis({
  xScale,
  height,
  style,
  tickFormat,
  s = identity,
}: XAxisProps) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const fmt = tickFormat ?? defaultTickFormat;
    const axis = axisBottom(xScale as any)
      .ticks(6)
      .tickFormat((d: any) => fmt(d instanceof Date ? d : new Date(d)));
    const g = select(ref.current).call(axis as any);

    g.selectAll("text")
      .style("font-family", style?.fontFamily ?? "var(--relay-font-family)")
      .style("font-size", `${style?.fontSize ?? s(11)}px`)
      .style(
        "font-weight",
        String(style?.fontWeight ?? "var(--relay-font-weight-normal)"),
      )
      .style("fill", style?.color ?? "currentColor");

    g.select(".domain").style("stroke", "var(--relay-grid-color, #e0e0e0)");
    g.selectAll(".tick line").style(
      "stroke",
      "var(--relay-grid-color, #e0e0e0)",
    );
  }, [xScale, style, tickFormat, s]);

  return <g ref={ref} transform={`translate(0,${height})`} />;
}

interface YAxisProps {
  yScale: ScaleLinear<number, number>;
  style?: FontStyle;
  /** Proportional scaler created by the parent chart. Defaults to identity. */
  s?: (px: number) => number;
}

export function YAxis({ yScale, style, s = identity }: YAxisProps) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const axis = axisLeft(yScale).ticks(5);
    const g = select(ref.current).call(axis);

    g.selectAll("text")
      .style("font-family", style?.fontFamily ?? "var(--relay-font-family)")
      .style("font-size", `${style?.fontSize ?? s(11)}px`)
      .style(
        "font-weight",
        String(style?.fontWeight ?? "var(--relay-font-weight-normal)"),
      )
      .style("fill", style?.color ?? "currentColor");

    g.select(".domain").style("stroke", "var(--relay-grid-color, #e0e0e0)");
    g.selectAll(".tick line").style(
      "stroke",
      "var(--relay-grid-color, #e0e0e0)",
    );
  }, [yScale, style, s]);

  return <g ref={ref} />;
}
