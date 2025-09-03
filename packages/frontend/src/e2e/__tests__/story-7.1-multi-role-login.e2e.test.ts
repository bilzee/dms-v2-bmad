import { test, expect } from '@playwright/test';

test.describe('Story 7.1: Multi-Role Login', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the session with multi-role user
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            email: 'multiuser@example.com',
            name: 'Multi Role User',
            assignedRoles: [
              { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
              { id: 'role-2', name: 'COORDINATOR', permissions: [], isActive: true }
            ],
            activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
            permissions: []
          }
        })
      });
    });

    // Mock the role switch endpoint
    await page.route('**/api/v1/auth/active-role', async route => {
      const requestData = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          data: {
            activeRoleId: requestData.roleId,
            roleName: requestData.roleName,
            message: 'Active role updated successfully'
          }
        })
      });
    });
  });

  test('AC1: Single login supporting multiple assigned roles', async ({ page }) => {
    await page.goto('/');
    
    // Verify user is logged in with multiple roles
    await expect(page.locator('[data-testid="role-indicator"]')).toBeVisible();
    
    // Should show ASSESSOR as active role initially
    await expect(page.locator('text=ASSESSOR')).toBeVisible();
  });

  test('AC2: Clear role indicator in UI', async ({ page }) => {
    await page.goto('/');
    
    // Role indicator should be visible in header
    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    await expect(roleIndicator).toBeVisible();
    
    // Should show current active role
    await expect(page.locator('text=ASSESSOR')).toBeVisible();
    
    // Should show dropdown for multi-role users
    await roleIndicator.click();
    await expect(page.locator('text=COORDINATOR')).toBeVisible();
  });

  test('AC3: Role-specific interface adaptations', async ({ page }) => {
    await page.goto('/');
    
    // Initially as ASSESSOR, should see assessment-specific navigation
    await expect(page.locator('text=Assessment Types')).toBeVisible();
    await expect(page.locator('text=Health')).toBeVisible();
    
    // Switch to COORDINATOR role
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();
    
    // Wait for role switch to complete
    await page.waitForResponse('**/api/v1/auth/active-role');
    
    // Should now see coordinator-specific navigation
    await expect(page.locator('text=Verification Dashboard')).toBeVisible();
    await expect(page.locator('text=Assessment Queue')).toBeVisible();
  });

  test('AC4: Shared entity access across roles', async ({ page }) => {
    await page.goto('/entities');
    
    // Should be able to access entities as ASSESSOR (read access)
    await expect(page.locator('h1')).toContainText('Entities');
    
    // Switch to COORDINATOR role
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();
    await page.waitForResponse('**/api/v1/auth/active-role');
    
    // Should still have access to entities as COORDINATOR (read + manage access)
    await page.goto('/entities');
    await expect(page.locator('h1')).toContainText('Entities');
  });

  test('Role switching updates navigation immediately', async ({ page }) => {
    await page.goto('/');
    
    // Verify initial ASSESSOR navigation
    await expect(page.locator('text=Assessment Types')).toBeVisible();
    
    // Switch to COORDINATOR
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();
    await page.waitForResponse('**/api/v1/auth/active-role');
    
    // Navigation should update without page reload
    await expect(page.locator('text=Verification Dashboard')).toBeVisible();
    await expect(page.locator('text=Assessment Types')).not.toBeVisible();
  });

  test('Role indicator shows correct badge styles', async ({ page }) => {
    await page.goto('/');
    
    const roleIndicator = page.locator('[data-testid="role-indicator"]');
    
    // ASSESSOR should have blue styling
    await expect(roleIndicator).toHaveClass(/bg-blue/);
    
    // Switch to COORDINATOR
    await roleIndicator.click();
    await page.locator('text=COORDINATOR').click();
    await page.waitForResponse('**/api/v1/auth/active-role');
    
    // COORDINATOR should have purple styling
    await expect(roleIndicator).toHaveClass(/bg-purple/);
  });

  test('Handles role switch errors gracefully', async ({ page }) => {
    // Mock role switch failure
    await page.route('**/api/v1/auth/active-role', async route => {
      await route.fulfill({
        status: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'User does not have this role'
        })
      });
    });

    await page.goto('/');
    
    await page.locator('[data-testid="role-indicator"]').click();
    await page.locator('text=COORDINATOR').click();
    
    // Should show error message or remain in current role
    await expect(page.locator('text=ASSESSOR')).toBeVisible();
  });

  test('Single-role users see simple badge without dropdown', async ({ page }) => {
    // Mock single-role user
    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            id: 'single-role-user',
            email: 'single@example.com',
            name: 'Single Role User',
            assignedRoles: [
              { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true }
            ],
            activeRole: { id: 'role-1', name: 'ASSESSOR', permissions: [], isActive: true },
            permissions: []
          }
        })
      });
    });

    await page.goto('/');
    
    // Should show role badge but no dropdown
    await expect(page.locator('text=ASSESSOR')).toBeVisible();
    await expect(page.locator('[data-testid="role-dropdown"]')).not.toBeVisible();
  });
});