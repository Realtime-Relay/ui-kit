import type { Meta, StoryObj } from "@storybook/react";
import { StatCard } from "../cards/StatCard";
import { StatCardWithGraph } from "../cards/StatCardWithGraph";
import { generateSparklineData } from "./mockData";

const meta: Meta<typeof StatCard> = {
  title: "Cards/StatCard",
  component: StatCard,
  decorators: [
    (Story) => (
      <div style={{ width: 240, height: 140 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof StatCard>;

export const Default: Story = {
  args: {
    value: 23.5,
    label: "Temperature",
    formatValue: (v: number) => `${v.toFixed(1)}°C`,
  },
};

export const WithBorder: Story = {
  args: {
    value: 1024,
    label: "Pressure",
    formatValue: (v: number) => `${v} hPa`,
    borderColor: "#e0e0e0",
    borderThickness: 1,
    borderRadius: "rounded",
  },
};

export const WithTimestamp: Story = {
  args: {
    value: 67,
    label: "Humidity",
    formatValue: (v: number) => `${v}%`,
    lastUpdated: Date.now(),
    showLastUpdated: true,
    borderColor: "#e0e0e0",
    borderThickness: 1,
  },
};

export const CustomStyled: Story = {
  args: {
    value: 42,
    label: "RPM",
    styles: {
      value: { fontSize: 40, fontWeight: 800, color: "#3b82f6" },
      label: { fontSize: 14, color: "#64748b" },
      background: { color: "#f1f5f9" },
    },
    borderRadius: 12,
  },
};

export const WithSparkline: StoryObj<typeof StatCardWithGraph> = {
  render: (args) => (
    <div style={{ width: 280, height: 160 }}>
      <StatCardWithGraph {...args} />
    </div>
  ),
  args: {
    value: 23.5,
    label: "Temperature",
    formatValue: (v: number) => `${v.toFixed(1)}°C`,
    sparklineData: generateSparklineData(30),
    sparklineMetric: "value",
    graphLineColor: "#3b82f6",
    borderColor: "#e0e0e0",
    borderThickness: 1,
    borderRadius: "rounded",
  },
};
