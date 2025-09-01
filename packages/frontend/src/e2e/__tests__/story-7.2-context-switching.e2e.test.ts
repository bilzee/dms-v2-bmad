import { test, expect } from '@playwright/test';

test.describe('Story 7.2: Context Switching E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.fill('[data-testid="email-input"]', 'multi.role@test.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="role-indicator"]')).toBeVisible();
  });

  test('AC1: Clear role switching interface for all role combinations', async ({ page }) => {
    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await expect(roleIndicator).toBeVisible();

    await roleIndicator.click();
    
    const roleDropdown = page.locator('[data-testid="role-dropdown"]');
    await expect(roleDropdown).toBeVisible();

    const availableRoles = roleDropdown.locator('[role="menuitem"]');
    const roleCount = await availableRoles.count();
    expect(roleCount).toBeGreaterThan(1);

    await expect(roleDropdown.locator('text=ASSESSOR')).toBeVisible();
    await expect(roleDropdown.locator('text=COORDINATOR')).toBeVisible();
  });

  test('AC2: Context-appropriate functionality display', async ({ page }) => {
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=ASSESSOR').click();

    await expect(page.locator('text=Assessment Types')).toBeVisible();
    await expect(page.locator('text=Health')).toBeVisible();
    await expect(page.locator('text=WASH')).toBeVisible();

    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();

    await expect(page.locator('text=Verification Dashboard')).toBeVisible();
    await expect(page.locator('text=Incident Management')).toBeVisible();
    await expect(page.locator('text=Assessment Types')).not.toBeVisible();
  });

  test('AC3: Maintained session data across role switches', async ({ page }) => {
    await page.goto('/assessments');
    
    const formData = 'Test assessment data';
    await page.fill('[data-testid="assessment-form-field"]', formData);

    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();

    await page.goto('/assessments');
    
    const savedData = await page.inputValue('[data-testid="assessment-form-field"]');
    expect(savedData).toBe(formData);
  });

  test('AC4: Clear visual indicators for active role', async ({ page }) => {
    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    
    await expect(roleIndicator.locator('text=ASSESSOR')).toBeVisible();
    await expect(roleIndicator).toHaveClass(/bg-blue-100/);

    await roleIndicator.click();
    await page.locator('text=COORDINATOR').click();

    await expect(roleIndicator.locator('text=COORDINATOR')).toBeVisible();
    await expect(roleIndicator).toHaveClass(/bg-purple-100/);

    await roleIndicator.click();
    const activeRoleBadge = page.locator('[data-testid="role-dropdown"] text=Active');
    await expect(activeRoleBadge).toBeVisible();
  });

  test('AC5: Performance requirements - Role switching completes within 200ms', async ({ page }) => {
    await page.addInitScript(() => {
      window.performanceData = [];
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        const response = await originalFetch(...args);
        const end = performance.now();
        if (args[0]?.toString().includes('switch-role')) {
          window.performanceData.push({ duration: end - start, url: args[0] });
        }
        return response;
      };
    });

    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await roleIndicator.click();

    const startTime = Date.now();
    await page.locator('text=COORDINATOR').click();
    
    await expect(roleIndicator.locator('text=COORDINATOR')).toBeVisible({ timeout: 500 });
    const elapsedTime = Date.now() - startTime;

    expect(elapsedTime).toBeLessThan(200);

    const performanceData = await page.evaluate(() => window.performanceData);
    expect(performanceData.length).toBeGreaterThan(0);
    expect(performanceData[0].duration).toBeLessThan(200);
  });

  test('AC6: Error handling with rollback capability', async ({ page }) => {
    await page.route('**/api/v1/auth/switch-role', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Database connection failed',
          rollbackInfo: { previousRoleId: 'role-1', timestamp: new Date().toISOString() }
        })
      });
    });

    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await roleIndicator.click();
    await page.locator('text=COORDINATOR').click();

    await expect(page.locator('text=Database connection failed')).toBeVisible();

    await roleIndicator.click();
    await expect(page.locator('text=Rollback Last Switch')).toBeVisible();

    await page.route('**/api/v1/auth/switch-role', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          newRole: { id: 'role-1', name: 'ASSESSOR', permissions: [] }
        })
      });
    });

    await page.locator('text=Rollback Last Switch').click();
    await expect(roleIndicator.locator('text=ASSESSOR')).toBeVisible();
  });

  test('Role switching preserves form state across navigation', async ({ page }) => {
    await page.goto('/responses/plan');
    
    if (await page.locator('[data-testid="response-form-field"]').isVisible()) {
      await page.fill('[data-testid="response-form-field"]', 'Emergency response plan');
    }

    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=ASSESSOR').click();

    await page.goto('/responses/plan');
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();

    if (await page.locator('[data-testid="response-form-field"]').isVisible()) {
      const preservedData = await page.inputValue('[data-testid="response-form-field"]');
      expect(preservedData).toBe('Emergency response plan');
    }
  });

  test('Navigation updates dynamically based on role permissions', async ({ page }) => {
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=ASSESSOR').click();

    await expect(page.locator('text=Assessment Types')).toBeVisible();
    await expect(page.locator('text=Verification Dashboard')).not.toBeVisible();

    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();

    await expect(page.locator('text=Verification Dashboard')).toBeVisible();
    await expect(page.locator('text=Assessment Types')).not.toBeVisible();
  });

  test('Role switching maintains offline data access consistency', async ({ page }) => {
    await page.context().setOffline(true);

    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await roleIndicator.click();
    
    await expect(page.locator('[data-testid="role-dropdown"]')).toBeVisible();
    
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
    if (await offlineIndicator.isVisible()) {
      await expect(offlineIndicator).toContainText('Offline');
    }

    await page.context().setOffline(false);
  });

  test('Performance monitoring displays switch completion time', async ({ page }) => {
    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await roleIndicator.click();
    await page.locator('text=COORDINATOR').click();

    await roleIndicator.click();
    const performanceText = page.locator('text=/Switch completed in \\d+ms/');
    await expect(performanceText).toBeVisible({ timeout: 3000 });

    const performanceMatch = await performanceText.textContent();
    const timeMs = parseInt(performanceMatch?.match(/(\d+)ms/)?.[1] || '0');
    expect(timeMs).toBeLessThan(200);
  });

  test('Unauthorized role access shows appropriate error', async ({ page }) => {
    await page.route('**/api/v1/auth/switch-role', route => {
      if (route.request().postDataJSON()?.targetRoleName === 'ADMIN') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'User does not have access to this role'
          })
        });
      } else {
        route.continue();
      }
    });

    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await roleIndicator.click();
    
    if (await page.locator('text=ADMIN').isVisible()) {
      await page.locator('text=ADMIN').click();
      await expect(page.locator('text=User does not have access to this role')).toBeVisible();
    }
  });
});