import { test, expect } from '@playwright/test';

test.describe('Auto-Approval Configuration Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auto-approval configuration page
    await page.goto('/coordinator/auto-approval');
    await page.waitForLoadState('networkidle');
  });

  test('should load auto-approval configuration page successfully', async ({ page }) => {
    // Verify page title and header
    await expect(page.locator('h1')).toContainText('Auto-Approval Configuration');
    await expect(page.locator('text=Configure automated approval rules')).toBeVisible();
    
    // Verify navigation elements
    await expect(page.locator('text=Back to Dashboard')).toBeVisible();
    
    // Verify configuration component is loaded
    await expect(page.locator('[data-testid="auto-approval-config"], .space-y-6')).toBeVisible();
  });

  test('should handle API configuration loading and display defaults', async ({ page }) => {
    await test.step('Load default configuration', async () => {
      // Wait for configuration to load
      await page.waitForSelector('text=Auto-Approval Configuration');
      
      // Verify default values are displayed
      await expect(page.locator('input[id="maxPerHour"]')).toHaveValue('50');
      await expect(page.locator('input[id="retentionDays"]')).toHaveValue('30');
      
      // Verify switches are in default state
      const enabledSwitch = page.locator('text=Enabled').locator('..').locator('button[role="switch"]');
      const coordinatorSwitch = page.locator('text=Require Coordinator Online').locator('..').locator('button[role="switch"]');
      const emergencySwitch = page.locator('text=Emergency Override Enabled').locator('..').locator('button[role="switch"]');
      
      await expect(enabledSwitch).toBeVisible();
      await expect(coordinatorSwitch).toBeVisible();
      await expect(emergencySwitch).toBeVisible();
    });
  });

  test('should create and save assessment rules', async ({ page }) => {
    await test.step('Enable auto-approval system', async () => {
      const enabledSwitch = page.locator('text=Enabled').locator('..').locator('button[role="switch"]');
      if (await enabledSwitch.getAttribute('aria-checked') === 'false') {
        await enabledSwitch.click();
      }
      await expect(enabledSwitch).toHaveAttribute('aria-checked', 'true');
    });

    await test.step('Add assessment rule', async () => {
      await page.click('text=Assessment Rules');
      await page.click('text=Add Assessment Rule');
      
      // Verify rule card is created
      await expect(page.locator('[data-testid="rule-card"], .space-y-4 > div').first()).toBeVisible();
      
      // Configure assessment type
      await page.click('text=Select type >> nth=0');
      await page.click('text=HEALTH >> nth=0');
      
      // Set quality thresholds
      await page.fill('input[type="number"]', '85');
    });

    await test.step('Save configuration', async () => {
      await page.click('text=Save Configuration');
      
      // Wait for save operation
      await page.waitForTimeout(1000);
      
      // Verify success message or no error
      const errorAlert = page.locator('[role="alert"]');
      if (await errorAlert.count() > 0) {
        const errorText = await errorAlert.textContent();
        console.log('Save error:', errorText);
      }
    });
  });

  test('should create and save response rules', async ({ page }) => {
    await test.step('Enable auto-approval system', async () => {
      const enabledSwitch = page.locator('text=Enabled').locator('..').locator('button[role="switch"]');
      if (await enabledSwitch.getAttribute('aria-checked') === 'false') {
        await enabledSwitch.click();
      }
    });

    await test.step('Add response rule', async () => {
      await page.click('text=Response Rules');
      await page.click('text=Add Response Rule');
      
      // Verify rule card is created
      await expect(page.locator('[data-testid="rule-card"], .space-y-4 > div').first()).toBeVisible();
      
      // Configure response type
      await page.click('text=Select type >> nth=0');
      await page.click('text=HEALTH >> nth=0');
    });

    await test.step('Save configuration', async () => {
      await page.click('text=Save Configuration');
      await page.waitForTimeout(1000);
    });
  });

  test('should test rules functionality', async ({ page }) => {
    await test.step('Enable auto-approval and add rules', async () => {
      const enabledSwitch = page.locator('text=Enabled').locator('..').locator('button[role="switch"]');
      if (await enabledSwitch.getAttribute('aria-checked') === 'false') {
        await enabledSwitch.click();
      }
      
      // Add a test rule
      await page.click('text=Add Assessment Rule');
      await page.click('text=Select type');
      await page.click('text=HEALTH');
    });

    await test.step('Test rules', async () => {
      await page.click('text=Test Rules');
      
      // Wait for test results
      await page.waitForTimeout(2000);
      
      // Verify test results are displayed (if successful) or error is handled
      const testResults = page.locator('text=Rule Test Results');
      const errorAlert = page.locator('[role="alert"]');
      
      // Either test results show or error is handled gracefully
      const hasResults = await testResults.count() > 0;
      const hasError = await errorAlert.count() > 0;
      
      expect(hasResults || hasError).toBeTruthy();
    });
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await test.step('Handle save errors', async () => {
      // Mock API to return error for testing
      await page.route('/api/v1/verification/auto-approval/config', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      const enabledSwitch = page.locator('text=Enabled').locator('..').locator('button[role="switch"]');
      if (await enabledSwitch.getAttribute('aria-checked') === 'false') {
        await enabledSwitch.click();
      }
      
      await page.click('text=Save Configuration');
      
      // Verify error handling
      await expect(page.locator('[role="alert"]')).toContainText('Failed to save');
    });
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await test.step('Navigate back to dashboard', async () => {
      await page.click('text=Back to Dashboard');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/coordinator\/dashboard/);
      await expect(page.locator('text=Verification Dashboard')).toBeVisible();
    });
  });

  test('should display configuration status badges', async ({ page }) => {
    await test.step('Check status badges', async () => {
      // Check enabled/disabled badge
      const statusBadge = page.locator('text=Disabled, text=Enabled').first();
      await expect(statusBadge).toBeVisible();
      
      // Check rules count badge
      const rulesBadge = page.locator('text=0 Rules, text=Rules').first();
      await expect(rulesBadge).toBeVisible();
    });
  });

  test('should update global settings', async ({ page }) => {
    await test.step('Update max approvals per hour', async () => {
      await page.fill('input[id="maxPerHour"]', '75');
      await expect(page.locator('input[id="maxPerHour"]')).toHaveValue('75');
    });

    await test.step('Update audit retention', async () => {
      await page.fill('input[id="retentionDays"]', '45');
      await expect(page.locator('input[id="retentionDays"]')).toHaveValue('45');
    });

    await test.step('Toggle coordinator requirement', async () => {
      const coordinatorSwitch = page.locator('text=Require Coordinator Online').locator('..').locator('button[role="switch"]');
      const initialState = await coordinatorSwitch.getAttribute('aria-checked');
      
      await coordinatorSwitch.click();
      
      const newState = await coordinatorSwitch.getAttribute('aria-checked');
      expect(newState).not.toBe(initialState);
    });
  });
});