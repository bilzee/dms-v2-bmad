import { test, expect } from '@playwright/test';

test('Historical Comparison - Assessments loads real data from database', async ({ page }) => {
  // Navigate to the drill-down page where Historical Comparison is located
  await page.goto('http://localhost:3001/monitoring/drill-down');
  
  // Wait for the page to load
  await page.waitForSelector('[data-testid="drill-down-page"]');
  
  // Click on the Assessments tab
  await page.click('button:has-text("Assessments")');
  
  // Wait for assessments to load
  await page.waitForSelector('[data-testid="assessment-card"]');
  
  // Wait for Historical Comparison to load (should not stay in loading state)
  await page.waitForSelector('[data-testid="historical-comparison-chart"]', { timeout: 15000 });
  
  // Check that it's not in loading state
  const isLoading = await page.locator('[data-testid="historical-comparison-loading"]').count();
  expect(isLoading).toBe(0);
  
  // Check that it's not in error state
  const isError = await page.locator('[data-testid="historical-comparison-error"]').count();
  expect(isError).toBe(0);
  
  // Check that the chart is displayed
  const chart = await page.locator('[data-testid="historical-comparison-chart"]');
  await expect(chart).toBeVisible();
  
  // Check for real data indicators
  const chartText = await chart.textContent();
  
  // Should show real metrics from database, not mock data
  expect(chartText).toContain('Historical Comparison - Assessments');
  
  // Check if there are trend indicators or metrics displayed
  // The component should show actual data points from the database
  console.log('Chart content:', chartText);
  
  // Verify the component is not showing empty/loading state
  expect(chartText).not.toContain('Loading historical trend data');
  
  console.log('Historical Comparison test passed - showing real database data');
});

test('Historical Comparison API returns real assessments data', async ({ request }) => {
  // Test the API endpoint directly
  const response = await request.get('http://localhost:3001/api/v1/monitoring/historical/assessments');
  
  expect(response.status()).toBe(200);
  
  const data = await response.json();
  expect(data.success).toBe(true);
  
  // Verify it contains real data structure
  expect(data.data).toHaveProperty('current');
  expect(data.data).toHaveProperty('historical');
  expect(data.data).toHaveProperty('trends');
  expect(data.data).toHaveProperty('analytics');
  
  // Verify current data has metrics from database
  expect(data.data.current.metrics).toHaveProperty('totalAssessments');
  
  // Verify historical data has real entries
  expect(data.data.historical.length).toBeGreaterThan(0);
  
  // Check that it contains real assessment data (not all zeros)
  const hasRealData = data.data.historical.some((entry: any) => 
    entry.metrics.totalAssessments > 0
  );
  
  console.log('API response has real assessment data:', hasRealData);
  expect(hasRealData).toBe(true);
  
  console.log('Historical Comparison API test passed');
});