import type { Meta, StoryObj } from '@storybook/react';
import { TimeSeries } from '../charts/TimeSeries';
import { generateTimeSeriesData } from './mockData';

const meta: Meta<typeof TimeSeries> = {
  title: 'Charts/TimeSeries',
  component: TimeSeries,
  decorators: [
    (Story) => (
      <div style={{ width: 700, height: 400 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    showGrid: { control: 'boolean' },
    area: { control: 'boolean' },
    showLegend: { control: 'boolean' },
    legendPosition: { control: 'radio', options: ['top', 'bottom'] },
    gridColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof TimeSeries>;

const singleMetricData = generateTimeSeriesData(100, ['temperature']);
const multiMetricData = generateTimeSeriesData(100, ['temperature', 'humidity']);

export const Default: Story = {
  args: {
    data: singleMetricData,
    title: 'Temperature',
  },
};

export const MultiMetric: Story = {
  args: {
    data: multiMetricData,
    title: 'Sensor Readings',
  },
};

export const AreaChart: Story = {
  args: {
    data: singleMetricData,
    title: 'Temperature (Area)',
    area: true,
  },
};

export const WithAlertZones: Story = {
  args: {
    data: singleMetricData,
    title: 'Temperature with Alerts',
    alertZones: [
      { min: 28, max: 35, color: '#ef4444', label: 'Critical' },
      { min: 24, max: 28, color: '#f59e0b', label: 'Warning' },
    ],
  },
};

export const CustomFormatting: Story = {
  args: {
    data: singleMetricData,
    title: 'Temperature',
    formatValue: (v: number) => `${v.toFixed(1)}°C`,
    metrics: [{ key: 'temperature', label: 'Temp °C', color: '#ef4444' }],
  },
};

export const NoGrid: Story = {
  args: {
    data: multiMetricData,
    title: 'Clean Look',
    showGrid: false,
  },
};

export const CustomStyles: Story = {
  args: {
    data: multiMetricData,
    title: 'Styled Chart',
    styles: {
      title: { fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700 },
      axis: { fontSize: 10, color: '#9ca3af' },
      background: { color: '#f8fafc' },
    },
  },
};
