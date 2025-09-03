import { test, expect } from '@playwright/test';

test.describe('Story 7.3: Role-Specific Interfaces', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
    
    await page.fill('[data-testid="email-input"]', 'multi.role@dms.example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="role-selector"]', { timeout: 15000 });
  });

  test.describe('AC1: Customized navigation for each role', () => {
    test('should show role-specific navigation sections for ASSESSOR', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const assessmentTypes = page.locator('[data-testid="nav-section-Assessment Types"]');
      await expect(assessmentTypes).toBeVisible();
      
      const assessmentManagement = page.locator('[data-testid="nav-section-Assessment Management"]');
      await expect(assessmentManagement).toBeVisible();

      const verificationDashboard = page.locator('[data-testid="nav-section-Verification Dashboard"]');
      await expect(verificationDashboard).not.toBeVisible();
    });

    test('should show role-specific navigation sections for COORDINATOR', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const verificationDashboard = page.locator('[data-testid="nav-section-Verification Dashboard"]');
      await expect(verificationDashboard).toBeVisible();
      
      const incidentManagement = page.locator('[data-testid="nav-section-Incident Management"]');
      await expect(incidentManagement).toBeVisible();

      const assessmentTypes = page.locator('[data-testid="nav-section-Assessment Types"]');
      await expect(assessmentTypes).not.toBeVisible();
    });

    test('should show role-specific quick actions', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const newHealthAssessment = page.locator('[data-testid="quick-action-new-health-assessment"]');
      await expect(newHealthAssessment).toBeVisible();
      
      const emergencyReport = page.locator('[data-testid="quick-action-emergency-report"]');
      await expect(emergencyReport).toBeVisible();
    });

    test('should adapt navigation dynamically when roles are switched', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const assessmentTypes = page.locator('[data-testid="nav-section-Assessment Types"]');
      await expect(assessmentTypes).toBeVisible();

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await expect(assessmentTypes).not.toBeVisible();
      
      const verificationDashboard = page.locator('[data-testid="nav-section-Verification Dashboard"]');
      await expect(verificationDashboard).toBeVisible();
    });
  });

  test.describe('AC2: Role-appropriate form fields and options', () => {
    test('should show role-specific form fields for ASSESSOR assessment forms', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/assessments/new?type=HEALTH"]');
      
      await page.waitForSelector('[data-testid="assessment-form"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="field-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-location"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-severity"]')).toBeVisible();
      
      await expect(page.locator('[data-testid="field-internal-notes"]')).not.toBeVisible();
    });

    test('should show role-specific form fields for COORDINATOR verification forms', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/verification/queue"]');
      
      await page.waitForSelector('[data-testid="verification-form"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="field-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-approval-notes"]')).toBeVisible();
      await expect(page.locator('[data-testid="field-internal-comments"]')).toBeVisible();
    });

    test('should apply role-specific default values', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/assessments/new"]');
      
      await page.waitForSelector('[data-testid="assessment-form"]', { timeout: 10000 });

      const typeField = page.locator('[data-testid="field-type"] select');
      await expect(typeField).toHaveValue('HEALTH');
      
      const priorityField = page.locator('[data-testid="field-priority"] select');
      await expect(priorityField).toHaveValue('MEDIUM');
    });

    test('should enforce role-specific validation rules', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/assessments/new"]');
      
      await page.waitForSelector('[data-testid="assessment-form"]', { timeout: 10000 });

      const severityField = page.locator('[data-testid="field-severity"] input');
      await severityField.fill('10');
      await page.click('[data-testid="submit-button"]');

      const validationError = page.locator('[data-testid="validation-error-severity"]');
      await expect(validationError).toBeVisible();
      await expect(validationError).toContainText('must be between 1 and 5');
    });
  });

  test.describe('AC3: Relevant dashboard sections by role', () => {
    test('should display role-specific dashboard layout for ASSESSOR', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="widget-active-assessments"]')).toBeVisible();
      await expect(page.locator('[data-testid="widget-emergency-reports"]')).toBeVisible();
      await expect(page.locator('[data-testid="widget-entities-assessed"]')).toBeVisible();

      await expect(page.locator('[data-testid="widget-verification-queue"]')).not.toBeVisible();
    });

    test('should display role-specific dashboard layout for COORDINATOR', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="widget-verification-queue"]')).toBeVisible();
      await expect(page.locator('[data-testid="widget-active-incidents"]')).toBeVisible();
      await expect(page.locator('[data-testid="widget-donor-commitments"]')).toBeVisible();
      await expect(page.locator('[data-testid="widget-system-conflicts"]')).toBeVisible();

      await expect(page.locator('[data-testid="widget-active-assessments"]')).not.toBeVisible();
    });

    test('should use different dashboard layouts for different roles', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const assessorDashboard = page.locator('[data-testid="dashboard"]');
      await expect(assessorDashboard).toHaveClass(/lg:grid-cols-3/);

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const coordinatorDashboard = page.locator('[data-testid="dashboard"]');
      await expect(coordinatorDashboard).toHaveClass(/lg:grid-cols-4/);
    });
  });

  test.describe('AC4: Hide/show functionality based on permissions', () => {
    test('should hide widgets when permissions are missing', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.evaluate(() => {
        const roleContext = (window as any).__ROLE_CONTEXT__;
        if (roleContext) {
          roleContext.permissions = roleContext.permissions.filter(
            (p: any) => !p.resource.includes('assessments')
          );
        }
      });

      await page.reload();
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="widget-active-assessments"]')).not.toBeVisible();
    });

    test('should show graceful fallbacks for restricted functionality', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.click('a[href="/admin/users"]');

      const fallbackMessage = page.locator('[data-testid="permission-fallback"]');
      await expect(fallbackMessage).toBeVisible();
      await expect(fallbackMessage).toContainText('not available for your current role');
    });

    test('should conditionally render form fields based on permissions', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/verification/queue"]');
      
      await page.waitForSelector('[data-testid="verification-form"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="field-internal-comments"]')).toBeVisible();

      await page.evaluate(() => {
        const roleContext = (window as any).__ROLE_CONTEXT__;
        if (roleContext) {
          roleContext.permissions = roleContext.permissions.filter(
            (p: any) => p.action !== 'write-internal'
          );
        }
      });

      await page.reload();
      await page.waitForSelector('[data-testid="verification-form"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="field-internal-comments"]')).not.toBeVisible();
    });
  });

  test.describe('Interface Customization and Preferences', () => {
    test('should allow users to customize dashboard layout', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.click('[data-testid="dashboard-settings-button"]');
      await page.selectOption('[data-testid="layout-selector"]', 'two-column');
      await page.click('[data-testid="save-preferences-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const dashboard = page.locator('[data-testid="dashboard"]');
      await expect(dashboard).toHaveClass(/md:grid-cols-2/);
      await expect(dashboard).not.toHaveClass(/lg:grid-cols-4/);
    });

    test('should persist interface preferences across sessions', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.click('[data-testid="dashboard-settings-button"]');
      await page.check('[data-testid="hide-widget-entities-assessed"]');
      await page.click('[data-testid="save-preferences-button"]');

      await page.reload();
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="widget-entities-assessed"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="widget-active-assessments"]')).toBeVisible();
    });

    test('should maintain separate preferences for different roles', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.click('[data-testid="dashboard-settings-button"]');
      await page.selectOption('[data-testid="layout-selector"]', 'single-column');
      await page.click('[data-testid="save-preferences-button"]');

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const coordinatorDashboard = page.locator('[data-testid="dashboard"]');
      await expect(coordinatorDashboard).toHaveClass(/lg:grid-cols-4/);

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const assessorDashboard = page.locator('[data-testid="dashboard"]');
      await expect(assessorDashboard).toHaveClass(/grid-cols-1/);
      await expect(assessorDashboard).not.toHaveClass(/lg:grid-cols-3/);
    });
  });

  test.describe('Widget Functionality', () => {
    test('should allow refreshing dashboard widgets', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const refreshButton = page.locator('[data-testid="widget-verification-queue"] [data-testid="refresh-button"]');
      await expect(refreshButton).toBeVisible();

      await refreshButton.click();

      const loadingIndicator = page.locator('[data-testid="widget-verification-queue"] [data-testid="loading-indicator"]');
      await expect(loadingIndicator).toBeVisible();
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    });

    test('should allow minimizing/expanding widgets', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const emergencyWidget = page.locator('[data-testid="widget-emergency-reports"]');
      const minimizeButton = emergencyWidget.locator('[data-testid="minimize-button"]');
      
      await minimizeButton.click();

      const widgetContent = emergencyWidget.locator('[data-testid="widget-content"]');
      await expect(widgetContent).not.toBeVisible();

      await minimizeButton.click();
      await expect(widgetContent).toBeVisible();
    });
  });

  test.describe('Form Field Ordering and Visibility', () => {
    test('should render form fields in role-specific order', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/assessments/new"]');
      
      await page.waitForSelector('[data-testid="assessment-form"]', { timeout: 10000 });

      const formFields = page.locator('[data-testid^="field-"]');
      const fieldCount = await formFields.count();

      const firstField = formFields.nth(0);
      await expect(firstField).toHaveAttribute('data-testid', 'field-type');

      const secondField = formFields.nth(1);
      await expect(secondField).toHaveAttribute('data-testid', 'field-location');
    });

    test('should show required field indicators based on role configuration', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      await page.click('a[href="/assessments/new"]');
      
      await page.waitForSelector('[data-testid="assessment-form"]', { timeout: 10000 });

      const typeLabel = page.locator('[data-testid="field-type"] label');
      await expect(typeLabel).toContainText('*');

      const locationLabel = page.locator('[data-testid="field-location"] label');
      await expect(locationLabel).toContainText('*');
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load role-specific interfaces within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();

      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle role switching smoothly', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const switchStartTime = Date.now();

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const switchTime = Date.now() - switchStartTime;
      expect(switchTime).toBeLessThan(2000);

      await expect(page.locator('[data-testid="widget-verification-queue"]')).toBeVisible();
    });

    test('should handle error states gracefully', async ({ page }) => {
      await page.route('/api/v1/auth/role-interface/*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Server error');

      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible();
    });
  });

  test.describe('Accessibility and Mobile Responsiveness', () => {
    test('should maintain accessibility standards for role-specific interfaces', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const quickActions = page.locator('[data-testid="quick-actions"] button');
      const actionCount = await quickActions.count();

      for (let i = 0; i < actionCount; i++) {
        const action = quickActions.nth(i);
        await expect(action).toHaveAttribute('aria-label');
        await expect(action).toBeFocused({ timeout: 1000 });
        await page.keyboard.press('Tab');
      }
    });

    test('should adapt role interfaces for mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.selectOption('[data-testid="role-selector"]', 'COORDINATOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const dashboard = page.locator('[data-testid="dashboard"]');
      await expect(dashboard).toHaveClass(/grid-cols-1/);
      await expect(dashboard).not.toHaveClass(/lg:grid-cols-4/);

      const quickActions = page.locator('[data-testid="quick-actions"]');
      await expect(quickActions).toHaveClass(/flex-wrap/);
    });
  });

  test.describe('Integration with Existing Role System', () => {
    test('should maintain session state during interface customization', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      await page.click('a[href="/assessments/new"]');
      await page.fill('[data-testid="field-location"] input', 'Test Location');

      await page.click('[data-testid="dashboard-settings-button"]');
      await page.check('[data-testid="hide-widget-entities-assessed"]');
      await page.click('[data-testid="save-preferences-button"]');

      await page.goBack();

      const locationField = page.locator('[data-testid="field-location"] input');
      await expect(locationField).toHaveValue('Test Location');
    });

    test('should work seamlessly with existing role switching', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const assessorNavigation = page.locator('[data-testid="nav-section-Assessment Types"]');
      await expect(assessorNavigation).toBeVisible();

      await page.click('[data-testid="role-switcher-button"]');
      await page.selectOption('[data-testid="role-selector"]', 'RESPONDER');
      await page.click('[data-testid="confirm-role-button"]');

      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const responderNavigation = page.locator('[data-testid="nav-section-Response Planning"]');
      await expect(responderNavigation).toBeVisible();
      await expect(assessorNavigation).not.toBeVisible();
    });
  });

  test.describe('Backward Compatibility', () => {
    test('should maintain existing functionality for single-role users', async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem('test-single-role-user', 'true');
      });

      await page.goto('/assessments');
      await page.waitForSelector('[data-testid="assessments-page"]', { timeout: 10000 });

      await expect(page.locator('[data-testid="role-switcher-button"]')).not.toBeVisible();
      
      const dashboard = page.locator('[data-testid="dashboard"]');
      await expect(dashboard).toBeVisible();
    });

    test('should preserve existing component interfaces', async ({ page }) => {
      await page.selectOption('[data-testid="role-selector"]', 'ASSESSOR');
      await page.click('[data-testid="confirm-role-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

      const legacyWidget = page.locator('[data-testid="legacy-assessment-widget"]');
      if (await legacyWidget.isVisible()) {
        await expect(legacyWidget).toHaveClass(/bg-white/);
        await expect(legacyWidget).toHaveClass(/p-6/);
      }
    });
  });
});