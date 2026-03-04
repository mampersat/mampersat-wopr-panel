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
    })
    .addNumberInput({
      path: 'cols',
      name: 'Columns',
      defaultValue: 80,
      settings: { min: 1, max: 240, step: 1 },
    })
    .addNumberInput({
      path: 'rows',
      name: 'Rows',
      defaultValue: 24,
      settings: { min: 1, max: 80, step: 1 },
    })
    .addRadio({
      path: 'shape',
      name: 'Cell shape',
      defaultValue: 'circle',
      settings: {
        options: [
          { value: 'circle',    label: 'Circle' },
          { value: 'rectangle', label: 'Rectangle' },
        ],
      },
    });
});
