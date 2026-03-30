import type { Meta, StoryObj } from "@storybook/react";
import { StateTimeline } from "../timelines/StateTimeline";
import { generateStateData } from "./mockData";

const meta: Meta<typeof StateTimeline> = {
  title: "Timelines/StateTimeline",
  component: StateTimeline,
  decorators: [
    (Story) => (
      <div style={{ width: 700, height: 120 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StateTimeline>;

export const Default: Story = {
  args: {
    data: generateStateData(100),
    metricKey: "temperature",
    stateMapper: (value: number) => {
      if (value > 28) return "critical";
      if (value > 24) return "warning";
      return "normal";
    },
    stateColors: {
      normal: "#22c55e",
      warning: "#f59e0b",
      critical: "#ef4444",
    },
  },
};

export const DeviceStatus: Story = {
  args: {
    data: generateStateData(80),
    metricKey: "temperature",
    stateMapper: (value: number) => {
      if (value > 26) return "running";
      if (value > 20) return "idle";
      return "stopped";
    },
    stateColors: {
      running: "#3b82f6",
      idle: "#f59e0b",
      stopped: "#6b7280",
    },
  },
};

export const CustomTooltip: Story = {
  args: {
    data: generateStateData(60),
    metricKey: "temperature",
    stateMapper: (value: number) => (value > 25 ? "active" : "inactive"),
    formatTooltip: (entry) =>
      `${entry.state.toUpperCase()} — ${new Date(entry.start).toLocaleTimeString()} to ${new Date(entry.end).toLocaleTimeString()}`,
  },
};
