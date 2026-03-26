import type { Meta, StoryObj } from '@storybook/react';
import { PresenceIndicator } from '../indicators/PresenceIndicator';
import { ProgressBar } from '../indicators/ProgressBar';

const presenceMeta: Meta<typeof PresenceIndicator> = {
  title: 'Indicators/PresenceIndicator',
  component: PresenceIndicator,
  argTypes: {
    online: { control: 'boolean' },
    size: { control: { type: 'range', min: 6, max: 32, step: 2 } },
    onlineColor: { control: 'color' },
    offlineColor: { control: 'color' },
  },
};

export default presenceMeta;
type PresenceStory = StoryObj<typeof PresenceIndicator>;

export const Online: PresenceStory = {
  args: { online: true },
};

export const Offline: PresenceStory = {
  args: { online: false },
};

export const LargeOnline: PresenceStory = {
  args: { online: true, size: 24 },
};

export const CustomColors: PresenceStory = {
  args: { online: true, onlineColor: '#06b6d4', offlineColor: '#6b7280' },
};

// ProgressBar stories
export const HorizontalProgress: StoryObj<typeof ProgressBar> = {
  render: (args) => (
    <div style={{ width: 400, height: 30 }}>
      <ProgressBar {...args} />
    </div>
  ),
  args: {
    value: 65,
    showLabel: true,
    formatValue: (v: number) => `${v}%`,
  },
};

export const ProgressWithAlertZones: StoryObj<typeof ProgressBar> = {
  render: (args) => (
    <div style={{ width: 400, height: 30 }}>
      <ProgressBar {...args} />
    </div>
  ),
  args: {
    value: 85,
    showLabel: true,
    formatValue: (v: number) => `${v}%`,
    alertZones: [
      { min: 0, max: 60, color: '#22c55e' },
      { min: 60, max: 80, color: '#f59e0b' },
      { min: 80, max: 100, color: '#ef4444' },
    ],
  },
};

export const VerticalProgress: StoryObj<typeof ProgressBar> = {
  render: (args) => (
    <div style={{ width: 40, height: 200 }}>
      <ProgressBar {...args} />
    </div>
  ),
  args: {
    value: 45,
    orientation: 'vertical',
    showLabel: false,
  },
};
