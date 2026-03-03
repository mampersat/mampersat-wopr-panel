import { test, expect } from '@grafana/plugin-e2e';

test('should render the canvas grid', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  await expect(panelEditPage.panel.locator).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
});

test('should expose DEFCON option', async ({ gotoPanelEditPage, readProvisionedDashboard }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  const options = panelEditPage.getCustomOptions('Wopr Panel');
  await expect(options.getSelect('DEFCON').locator).toBeVisible();
});

test('should expose tick interval option', async ({ gotoPanelEditPage, readProvisionedDashboard }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  const options = panelEditPage.getCustomOptions('Wopr Panel');
  await expect(options.getNumberInput('Tick interval (ms)').locator).toBeVisible();
});
