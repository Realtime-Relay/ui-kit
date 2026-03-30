import type { Meta, StoryObj } from "@storybook/react";
import { NeedleGauge } from "../gauges/NeedleGauge";
import { ArcGauge } from "../gauges/ArcGauge";

const needleMeta: Meta<typeof NeedleGauge> = {
  title: "Gauges/NeedleGauge",
  component: NeedleGauge,
  decorators: [
    (Story) => (
      <div style={{ width: 300, height: 200 }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 1 } },
  },
};

export default needleMeta;
type NeedleStory = StoryObj<typeof NeedleGauge>;

export const NeedleDefault: NeedleStory = {
  args: {
    value: 65,
    label: "CPU Usage",
    unit: "%",
  },
};

export const NeedleWithAlertZones: NeedleStory = {
  args: {
    value: 82,
    label: "Temperature",
    unit: "°C",
    alertZones: [
      { min: 0, max: 60, color: "#22c55e" },
      { min: 60, max: 80, color: "#f59e0b" },
      { min: 80, max: 100, color: "#ef4444" },
    ],
  },
};

// Arc gauge stories using a separate file would be cleaner,
// but we can use the same file with named exports
export const ArcDefault: StoryObj<typeof ArcGauge> = {
  render: (args) => (
    <div style={{ width: 300, height: 200 }}>
      <ArcGauge {...args} />
    </div>
  ),
  args: {
    value: 72,
    label: "Memory",
    unit: "%",
  },
};

export const ArcWithAlertZones: StoryObj<typeof ArcGauge> = {
  render: (args) => (
    <div style={{ width: 300, height: 200 }}>
      <ArcGauge {...args} />
    </div>
  ),
  args: {
    value: 45,
    label: "Pressure",
    unit: "PSI",
    min: 0,
    max: 60,
    alertZones: [
      { min: 0, max: 20, color: "#ef4444" },
      { min: 20, max: 40, color: "#f59e0b" },
      { min: 40, max: 60, color: "#22c55e" },
    ],
  },
};
