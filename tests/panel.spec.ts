import { test, expect } from '@grafana/plugin-e2e';

test('should render the canvas grid', async ({ panelEditPage, page }) => {
  await panelEditPage.setVisualization('Wopr Panel');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
});

test('should expose DEFCON option', async ({ panelEditPage }) => {
  await panelEditPage.setVisualization('Wopr Panel');
  const options = panelEditPage.getCustomOptions('Wopr Panel');
  await expect(options.getSelect('DEFCON').locator()).toBeVisible();
});

test('should expose tick interval option', async ({ panelEditPage }) => {
  await panelEditPage.setVisualization('Wopr Panel');
  const options = panelEditPage.getCustomOptions('Wopr Panel');
  await expect(options.getNumberInput('Tick interval (ms)')).toBeVisible();
});
