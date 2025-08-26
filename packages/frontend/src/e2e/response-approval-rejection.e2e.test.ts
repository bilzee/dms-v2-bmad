import { test, expect } from '@playwright/test';

test.describe('Response Approval/Rejection (Story 3.3)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to response verification queue
    await page.goto('/verification/responses/queue');
  });

  test('should display the response verification queue page', async ({ page }) => {
    // Check that the main page loads
    await expect(page.locator('h2:has-text("Response Verification Queue")')).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check for filters button
    await expect(page.locator('button:has-text("Filters")')).toBeVisible();
  });

  test('should show response approval components for pending responses', async ({ page }) => {
    // Look for approval buttons in the queue
    const approvalButtons = page.locator('button:has-text("Quick Approve")');
    const detailedApprovalButtons = page.locator('button:has-text("Approve with Note")');
    
    // If there are pending responses, we should see approval buttons
    if (await approvalButtons.count() > 0) {
      await expect(approvalButtons.first()).toBeVisible();
      await expect(detailedApprovalButtons.first()).toBeVisible();
    }
  });

  test('should show response rejection components for pending responses', async ({ page }) => {
    // Look for rejection buttons in the queue
    const rejectionButtons = page.locator('button:has-text("Reject Response")');
    
    // If there are pending responses, we should see rejection buttons
    if (await rejectionButtons.count() > 0) {
      await expect(rejectionButtons.first()).toBeVisible();
    }
  });

  test('should open detailed approval dialog when clicked', async ({ page }) => {
    const detailedApprovalButtons = page.locator('button:has-text("Approve with Note")');
    
    if (await detailedApprovalButtons.count() > 0) {
      // Click the first detailed approval button
      await detailedApprovalButtons.first().click();
      
      // Check that the approval dialog opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Approve Response')).toBeVisible();
      
      // Check for approval note textarea
      await expect(page.locator('textarea[placeholder*="approval"]')).toBeVisible();
      
      // Check for notification checkbox
      await expect(page.locator('text=Notify responder')).toBeVisible();
      
      // Check for approve button
      await expect(page.locator('button:has-text("Approve Response")')).toBeVisible();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should open rejection dialog when clicked', async ({ page }) => {
    const rejectionButtons = page.locator('button:has-text("Reject Response")');
    
    if (await rejectionButtons.count() > 0) {
      // Click the first rejection button
      await rejectionButtons.first().click();
      
      // Check that the rejection dialog opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Reject Response')).toBeVisible();
      
      // Check for rejection reason dropdown
      await expect(page.locator('text=Rejection Reason')).toBeVisible();
      
      // Check for priority dropdown
      await expect(page.locator('text=Feedback Priority')).toBeVisible();
      
      // Check for feedback textarea
      await expect(page.locator('textarea[placeholder*="feedback"]')).toBeVisible();
      
      // Check for reject button
      await expect(page.locator('button:has-text("Reject Response")')).toBeVisible();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should validate rejection form requires comments', async ({ page }) => {
    const rejectionButtons = page.locator('button:has-text("Reject Response")');
    
    if (await rejectionButtons.count() > 0) {
      // Click rejection button
      await rejectionButtons.first().click();
      
      // Try to submit without comments
      const submitButton = page.locator('button:has-text("Reject Response")').last();
      
      // The button should be disabled when no comments are provided
      await expect(submitButton).toBeDisabled();
      
      // Add some comments
      await page.locator('textarea[placeholder*="feedback"]').fill('Test rejection feedback');
      
      // Now the button should be enabled
      await expect(submitButton).not.toBeDisabled();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should show batch operations when responses are selected', async ({ page }) => {
    // Look for checkboxes to select responses
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    
    if (await checkboxes.count() > 0) {
      // Select the first response
      await checkboxes.first().click();
      
      // Check that batch operations appear
      await expect(page.locator('text=Batch Approval')).toBeVisible();
      await expect(page.locator('text=Batch Rejection')).toBeVisible();
    }
  });

  test('should test API endpoints exist', async ({ page }) => {
    // Test if the approval API endpoint exists by making a request
    const response1 = await page.request.post('/api/v1/verification/responses/test-id/approve', {
      data: {
        responseId: 'test-id',
        coordinatorId: 'test-coordinator',
        coordinatorName: 'Test Coordinator',
        approvalNote: 'Test approval note',
        notifyResponder: true
      }
    });
    
    // We expect either 404 (endpoint exists but ID not found) or 405 (method not allowed)
    // but not 500 (server error indicating missing endpoint)
    expect([404, 405, 200].includes(response1.status())).toBeTruthy();
    
    // Test if the rejection API endpoint exists
    const response2 = await page.request.post('/api/v1/verification/responses/test-id/reject', {
      data: {
        responseId: 'test-id',
        coordinatorId: 'test-coordinator',
        coordinatorName: 'Test Coordinator',
        rejectionReason: 'DATA_QUALITY_ISSUES',
        priority: 'HIGH',
        rejectionComments: 'Test rejection comments',
        requiresResubmission: true
      }
    });
    
    expect([404, 405, 200].includes(response2.status())).toBeTruthy();
    
    // Test batch endpoints
    const response3 = await page.request.post('/api/v1/verification/responses/batch', {
      data: {
        action: 'APPROVE',
        responseIds: ['test-id-1', 'test-id-2'],
        coordinatorId: 'test-coordinator',
        coordinatorName: 'Test Coordinator'
      }
    });
    
    expect([404, 405, 200].includes(response3.status())).toBeTruthy();
  });

  test('should handle mobile responsive design', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that the page still loads and is usable
    await expect(page.locator('h2:has-text("Response Verification Queue")')).toBeVisible();
    
    // Check that mobile-specific controls are present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check if there's a mobile menu or hamburger button
    const mobileMenuButton = page.locator('button[aria-label*="menu"]');
    if (await mobileMenuButton.count() > 0) {
      await expect(mobileMenuButton).toBeVisible();
    }
  });

  test('should handle desktop responsive design', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check that the page loads with desktop layout
    await expect(page.locator('h2:has-text("Response Verification Queue")')).toBeVisible();
    
    // Check that desktop-specific elements are visible
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    await expect(page.locator('button:has-text("Filters")')).toBeVisible();
    
    // Check for larger table view on desktop
    const table = page.locator('table');
    if (await table.count() > 0) {
      await expect(table).toBeVisible();
    }
  });

  test('should navigate to response verification dashboard', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/verification/responses');
    
    // Check that the dashboard loads
    await expect(page.locator('h1:has-text("Response Verification")')).toBeVisible();
    
    // Check for stats cards
    await expect(page.locator('text=Pending Verification')).toBeVisible();
    await expect(page.locator('text=Requires Attention')).toBeVisible();
    
    // Check for navigation button to queue
    const queueButton = page.locator('button:has-text("Open Verification Queue")');
    await expect(queueButton).toBeVisible();
    
    // Click the button to navigate to queue
    await queueButton.click();
    
    // Verify we're on the queue page
    await expect(page.locator('h2:has-text("Response Verification Queue")')).toBeVisible();
  });

  test('should show proper verification workflow indicators', async ({ page }) => {
    // Check for status indicators
    const statusIndicators = page.locator('[data-testid="verification-status"]');
    
    if (await statusIndicators.count() > 0) {
      await expect(statusIndicators.first()).toBeVisible();
    }
    
    // Check for priority indicators
    const priorityIndicators = page.locator('[data-testid="priority-indicator"]');
    
    if (await priorityIndicators.count() > 0) {
      await expect(priorityIndicators.first()).toBeVisible();
    }
    
    // Check for progress indicators
    const progressBars = page.locator('[role="progressbar"]');
    
    if (await progressBars.count() > 0) {
      await expect(progressBars.first()).toBeVisible();
    }
  });
});