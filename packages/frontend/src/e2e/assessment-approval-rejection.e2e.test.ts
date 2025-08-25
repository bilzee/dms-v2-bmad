import { test, expect } from '@playwright/test';

test.describe('Assessment Approval/Rejection (Story 3.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to verification queue
    await page.goto('/verification/queue');
  });

  test('should display the verification queue page', async ({ page }) => {
    // Check that the main page loads
    await expect(page.locator('h2:has-text("Assessment Verification Queue")')).toBeVisible();
    
    // Check for search functionality
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check for filters button
    await expect(page.locator('button:has-text("Filters")')).toBeVisible();
  });

  test('should show assessment approval components for pending assessments', async ({ page }) => {
    // Look for approval buttons in the queue
    const approvalButtons = page.locator('button:has-text("Quick Approve")');
    const detailedApprovalButtons = page.locator('button:has-text("Approve with Note")');
    
    // If there are pending assessments, we should see approval buttons
    if (await approvalButtons.count() > 0) {
      await expect(approvalButtons.first()).toBeVisible();
      await expect(detailedApprovalButtons.first()).toBeVisible();
    }
  });

  test('should show assessment rejection components for pending assessments', async ({ page }) => {
    // Look for rejection buttons in the queue
    const rejectionButtons = page.locator('button:has-text("Reject Assessment")');
    
    // If there are pending assessments, we should see rejection buttons
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
      await expect(page.locator('text=Approve Assessment')).toBeVisible();
      
      // Check for approval note textarea
      await expect(page.locator('textarea[placeholder*="approval"]')).toBeVisible();
      
      // Check for notification checkbox
      await expect(page.locator('text=Notify assessor')).toBeVisible();
      
      // Check for approve button
      await expect(page.locator('button:has-text("Approve Assessment")')).toBeVisible();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should open rejection dialog when clicked', async ({ page }) => {
    const rejectionButtons = page.locator('button:has-text("Reject Assessment")');
    
    if (await rejectionButtons.count() > 0) {
      // Click the first rejection button
      await rejectionButtons.first().click();
      
      // Check that the rejection dialog opens
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Reject Assessment')).toBeVisible();
      
      // Check for rejection reason dropdown
      await expect(page.locator('text=Rejection Reason')).toBeVisible();
      
      // Check for priority dropdown
      await expect(page.locator('text=Feedback Priority')).toBeVisible();
      
      // Check for feedback textarea
      await expect(page.locator('textarea[placeholder*="feedback"]')).toBeVisible();
      
      // Check for reject button
      await expect(page.locator('button:has-text("Reject Assessment")')).toBeVisible();
      
      // Close dialog
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('should validate rejection form requires comments', async ({ page }) => {
    const rejectionButtons = page.locator('button:has-text("Reject Assessment")');
    
    if (await rejectionButtons.count() > 0) {
      // Click rejection button
      await rejectionButtons.first().click();
      
      // Try to submit without comments
      const submitButton = page.locator('button:has-text("Reject Assessment")').last();
      
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

  test('should show batch operations when assessments are selected', async ({ page }) => {
    // Look for checkboxes to select assessments
    const checkboxes = page.locator('tbody input[type="checkbox"]');
    
    if (await checkboxes.count() > 0) {
      // Select the first assessment
      await checkboxes.first().click();
      
      // Check that batch operations appear
      await expect(page.locator('text=Batch Approval')).toBeVisible();
      await expect(page.locator('text=Batch Rejection')).toBeVisible();
    }
  });

  test('should test API endpoints exist', async ({ page }) => {
    // Test if the approval API endpoint exists by making a request
    const response1 = await page.request.post('/api/v1/verification/assessments/test-id/approve', {
      data: {
        assessmentId: 'test-id',
        coordinatorId: 'test-coordinator',
        coordinatorName: 'Test Coordinator',
        approvalTimestamp: new Date(),
        notifyAssessor: true,
      },
    });
    
    // Should not return 404 (endpoint exists)
    expect(response1.status()).not.toBe(404);
    
    // Test if the rejection API endpoint exists
    const response2 = await page.request.post('/api/v1/verification/assessments/test-id/reject', {
      data: {
        assessmentId: 'test-id',
        coordinatorId: 'test-coordinator',
        coordinatorName: 'Test Coordinator',
        rejectionReason: 'DATA_QUALITY',
        rejectionComments: 'Test rejection',
        priority: 'NORMAL',
        requiresResubmission: true,
        notifyAssessor: true,
        rejectionTimestamp: new Date(),
      },
    });
    
    // Should not return 404 (endpoint exists)
    expect(response2.status()).not.toBe(404);
  });
});