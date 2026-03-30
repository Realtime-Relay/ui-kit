import type { Meta, StoryObj } from "@storybook/react";
import { BarGraph } from "../charts/BarGraph";
import { generateTimeSeriesData } from "./mockData";

const meta: Meta<typeof BarGraph> = {
  title: "Charts/BarGraph",
  component: BarGraph,
  decorators: [
    (Story) => (
      <div style={{ width: 700, height: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BarGraph>;

export const Default: Story = {
  args: {
    data: generateTimeSeriesData(20, ["temperature"]),
    title: "Temperature Readings",
  },
};

export const MultiMetric: Story = {
  args: {
    data: generateTimeSeriesData(15, ["temperature", "humidity"]),
    title: "Sensor Comparison",
  },
};

export const WithAlertZones: Story = {
  args: {
    data: generateTimeSeriesData(20, ["temperature"]),
    title: "Temperature with Alerts",
    alertZones: [{ min: 28, max: 35, color: "#ef4444", label: "High" }],
  },
};
