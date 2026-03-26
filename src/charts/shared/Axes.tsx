import { useEffect, useRef } from 'react';
import { select, axisBottom, axisLeft, type ScaleLinear, type ScaleTime } from 'd3';
import type { FontStyle } from '../../utils/types';

interface AxesProps {
  xScale: ScaleTime<number, number> | ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
  width: number;
  height: number;
  style?: FontStyle;
}

export function XAxis({ xScale, height, style }: Pick<AxesProps, 'xScale' | 'height' | 'style'>) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const axis = axisBottom(xScale as any).ticks(6);
    const g = select(ref.current).call(axis as any);

    g.selectAll('text')
      .style('font-family', style?.fontFamily ?? 'var(--relay-font-family)')
      .style('font-size', `${style?.fontSize ?? 11}px`)
      .style('font-weight', String(style?.fontWeight ?? 'var(--relay-font-weight-normal)'))
      .style('fill', style?.color ?? 'currentColor');

    g.select('.domain').style('stroke', 'var(--relay-grid-color, #e0e0e0)');
    g.selectAll('.tick line').style('stroke', 'var(--relay-grid-color, #e0e0e0)');
  }, [xScale, style]);

  return <g ref={ref} transform={`translate(0,${height})`} />;
}

export function YAxis({ yScale, style }: Pick<AxesProps, 'yScale' | 'style'>) {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const axis = axisLeft(yScale).ticks(5);
    const g = select(ref.current).call(axis);

    g.selectAll('text')
      .style('font-family', style?.fontFamily ?? 'var(--relay-font-family)')
      .style('font-size', `${style?.fontSize ?? 11}px`)
      .style('font-weight', String(style?.fontWeight ?? 'var(--relay-font-weight-normal)'))
      .style('fill', style?.color ?? 'currentColor');

    g.select('.domain').style('stroke', 'var(--relay-grid-color, #e0e0e0)');
    g.selectAll('.tick line').style('stroke', 'var(--relay-grid-color, #e0e0e0)');
  }, [yScale, style]);

  return <g ref={ref} />;
}
