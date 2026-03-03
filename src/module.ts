import { PanelPlugin } from '@grafana/data';
import { WoprOptions } from './types';
import { WoprPanel } from './components/WoprPanel';

export const plugin = new PanelPlugin<WoprOptions>(WoprPanel).setPanelOptions((builder) => {
  return builder
    .addNumberInput({
      path: 'tickIntervalMs',
      name: 'Tick interval (ms)',
      description: 'How often the grid updates, in milliseconds.',
      defaultValue: 100,
      settings: { min: 16, max: 5000, step: 1 },
    })
    .addSelect({
      path: 'defcon',
      name: 'DEFCON',
      description: 'Threat level — 5 is peacetime, 1 is maximum. Accepts a dashboard variable e.g. $defcon.',
      defaultValue: '5',
      settings: {
        options: [
          { value: '5', label: 'DEFCON 5' },
          { value: '4', label: 'DEFCON 4' },
          { value: '3', label: 'DEFCON 3' },
          { value: '2', label: 'DEFCON 2' },
          { value: '1', label: 'DEFCON 1' },
        ],
        allowCustomValue: true,
      },
    });
});
