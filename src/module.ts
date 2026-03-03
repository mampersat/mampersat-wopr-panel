import { PanelPlugin } from '@grafana/data';
import { WoprOptions } from './types';
import { WoprPanel } from './components/WoprPanel';

export const plugin = new PanelPlugin<WoprOptions>(WoprPanel).setPanelOptions((builder) => {
  return builder.addNumberInput({
    path: 'tickIntervalMs',
    name: 'Tick interval (ms)',
    description: 'How often the grid updates, in milliseconds.',
    defaultValue: 100,
    settings: { min: 16, max: 5000, step: 1 },
  });
});
