import { test, expect } from '@playwright/test';

test.describe('Navigation Path Implementation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display all navigation sections', async ({ page }) => {
    // Verify section headers are present
    await expect(page.getByRole('heading', { name: 'Core Tools' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Coordinator Tools' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Monitoring Tools' })).toBeVisible();
  });

  test('should navigate to donor coordination from coordinator tools', async ({ page }) => {
    // Click on Donor Coordination card
    await page.getByRole('button', { name: /Navigate to Donor Coordination/ }).click();
    
    // Verify we're on the donor coordination page
    await expect(page).toHaveURL('/coordinator/donors');
    await expect(page.getByRole('heading', { name: 'Donor Coordination' })).toBeVisible();
  });

  test('should navigate to system monitoring from coordinator tools', async ({ page }) => {
    // Click on System Monitoring card
    await page.getByRole('button', { name: /Navigate to System Monitoring/ }).click();
    
    // Verify we're on the system monitoring page
    await expect(page).toHaveURL('/coordinator/monitoring');
    await expect(page.getByRole('heading', { name: 'System Performance Monitoring' })).toBeVisible();
  });

  test('should navigate to situation display from monitoring tools', async ({ page }) => {
    // Click on Situation Display card
    await page.getByRole('button', { name: /Navigate to Situation Display/ }).click();
    
    // Verify we're on the situation display page
    await expect(page).toHaveURL('/monitoring');
    await expect(page.getByRole('heading', { name: 'Real-Time Situation Display' })).toBeVisible();
  });

  test('should navigate to interactive map from monitoring tools', async ({ page }) => {
    // Click on Interactive Map card
    await page.getByRole('button', { name: /Navigate to Interactive Map/ }).click();
    
    // Verify we're on the interactive map page
    await expect(page).toHaveURL('/monitoring/map');
    await expect(page.getByRole('heading', { name: 'Interactive Mapping' })).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on first coordinator tool and press Enter
    await page.getByRole('button', { name: /Navigate to Donor Coordination/ }).focus();
    await page.keyboard.press('Enter');
    
    // Verify navigation occurred
    await expect(page).toHaveURL('/coordinator/donors');
  });

  test('should support keyboard navigation with space key', async ({ page }) => {
    // Focus on monitoring tool and press Space
    await page.getByRole('button', { name: /Navigate to Interactive Map/ }).focus();
    await page.keyboard.press(' ');
    
    // Verify navigation occurred
    await expect(page).toHaveURL('/monitoring/map');
  });

  test('should maintain visual hierarchy and styling consistency', async ({ page }) => {
    // Check that all section headers use consistent styling
    const headers = page.locator('h2').filter({ hasText: /Core Tools|Coordinator Tools|Monitoring Tools/ });
    await expect(headers).toHaveCount(3);
    
    // Check that all navigation cards have proper styling
    const navCards = page.locator('[role="button"]').filter({ hasText: /Navigate to/ });
    await expect(navCards).toHaveCount(9); // 5 core + 2 coordinator + 2 monitoring
  });
});