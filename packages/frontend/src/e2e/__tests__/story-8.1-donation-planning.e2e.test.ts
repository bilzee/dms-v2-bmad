import { test, expect } from '@playwright/test';

test.describe('Story 8.1: Donation Planning', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and navigate to donor dashboard
    await page.goto('/');
    
    // TODO: Add proper authentication setup
    // For now, assume we can navigate directly to donor dashboard
    await page.goto('/donor');
  });

  test('donor can register a new donation commitment', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Fill out commitment form
    await page.getByRole('tab', { name: /food/i }).click(); // Select FOOD response type
    await page.getByLabel(/quantity/i).fill('500');
    await page.getByLabel(/unit/i).fill('kg');
    
    // Set target date to 1 week from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.getByLabel(/target delivery date/i).fill(dateString);
    
    // Add notes
    await page.getByLabel(/notes/i).fill('Rice and beans for flood victims');

    // Verify preview is shown
    await expect(page.getByText(/500 kg of food supplies/i)).toBeVisible();

    // Submit commitment
    await page.getByRole('button', { name: /register commitment/i }).click();

    // Verify success - should navigate back to commitments list
    await expect(page.getByRole('tab', { name: /my commitments/i })).toHaveAttribute('aria-selected', 'true');
    
    // Verify commitment appears in list
    await expect(page.getByText(/food commitment/i)).toBeVisible();
    await expect(page.getByText(/500 kg/i)).toBeVisible();
  });

  test('form validates required fields', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /register commitment/i }).click();

    // Verify validation errors
    await expect(page.getByText(/quantity must be at least 1/i)).toBeVisible();
    await expect(page.getByText(/unit is required/i)).toBeVisible();
  });

  test('form enforces quantity range validation', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Test invalid quantity (too low)
    await page.getByLabel(/quantity/i).fill('0');
    await page.getByLabel(/unit/i).fill('kg'); // Focus another field to trigger validation
    
    await expect(page.getByText(/quantity must be at least 1/i)).toBeVisible();

    // Test invalid quantity (too high)
    await page.getByLabel(/quantity/i).fill('1000000');
    await page.getByLabel(/unit/i).click();
    
    await expect(page.getByText(/quantity cannot exceed 999,999/i)).toBeVisible();
  });

  test('form enforces future date validation', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Try to set date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];
    
    await page.getByLabel(/target delivery date/i).fill(yesterdayString);
    await page.getByLabel(/quantity/i).click(); // Focus another field
    
    await expect(page.getByText(/target date must be at least tomorrow/i)).toBeVisible();
  });

  test('donor can switch between response types', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Initially Health should be selected
    await expect(page.getByRole('tab', { name: /health/i })).toHaveAttribute('aria-selected', 'true');

    // Switch to WASH
    await page.getByRole('tab', { name: /wash/i }).click();
    await expect(page.getByRole('tab', { name: /wash/i })).toHaveAttribute('aria-selected', 'true');

    // Switch to Food
    await page.getByRole('tab', { name: /food/i }).click();
    await expect(page.getByRole('tab', { name: /food/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('unit suggestions appear when focusing unit field', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Select Health response type
    await page.getByRole('tab', { name: /health/i }).click();

    // Focus unit field
    await page.getByLabel(/unit/i).click();

    // Verify health-related unit suggestions appear
    await expect(page.getByText(/common units for health/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'kits' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'units' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'doses' })).toBeVisible();
  });

  test('auto-save functionality works', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Fill some fields
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/unit/i).fill('kg');

    // Wait for auto-save indicator
    await expect(page.getByTestId('auto-save-indicator')).toContainText(/last saved/i);
  });

  test('donor can view and filter their commitments', async ({ page }) => {
    // Should be on commitments tab by default
    await expect(page.getByRole('tab', { name: /my commitments/i })).toHaveAttribute('aria-selected', 'true');

    // Test filtering by status
    await page.selectOption('select', { label: 'Planned' });
    
    // Verify only planned commitments are shown
    const commitmentCards = page.locator('[data-testid="commitment-card"]');
    const visibleCards = await commitmentCards.count();
    
    for (let i = 0; i < visibleCards; i++) {
      await expect(commitmentCards.nth(i).getByText(/planned/i)).toBeVisible();
    }

    // Test search functionality
    await page.getByPlaceholder(/search commitments/i).fill('food');
    
    // Verify filtering works
    const searchResults = page.locator('[data-testid="commitment-card"]');
    const searchCount = await searchResults.count();
    
    // Should show fewer or same number of results
    expect(searchCount).toBeLessThanOrEqual(visibleCards);
  });

  test('donor can edit an existing commitment', async ({ page }) => {
    // Find and edit a planned commitment
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    await editButton.click();

    // Modify quantity
    await page.getByLabel(/quantity/i).fill('750');
    
    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify update
    await expect(page.getByText(/750/)).toBeVisible();
    await expect(page.getByText(/commitment updated successfully/i)).toBeVisible();
  });

  test('donor can cancel a commitment with reason', async ({ page }) => {
    // Find and cancel a planned commitment
    const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    await cancelButton.click();

    // Handle the confirmation dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('reason for cancelling');
      await dialog.accept('Supply chain issues');
    });

    // Verify cancellation
    await expect(page.getByText(/cancelled/i)).toBeVisible();
  });

  test('donor can view and update their profile', async ({ page }) => {
    // Navigate to profile tab
    await page.getByRole('tab', { name: /profile/i }).click();

    // Verify profile information is displayed
    await expect(page.getByText(/donor profile/i)).toBeVisible();
    await expect(page.getByText(/actionaid nigeria/i)).toBeVisible();

    // Edit profile
    await page.getByRole('button', { name: /edit/i }).click();

    // Update phone number
    await page.getByLabel(/phone/i).fill('+234-812-999-8888');

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify update
    await expect(page.getByText(/\+234-812-999-8888/)).toBeVisible();
  });

  test('displays performance metrics and completion status', async ({ page }) => {
    // Navigate to profile tab
    await page.getByRole('tab', { name: /profile/i }).click();

    // Verify performance score is displayed
    await expect(page.getByText(/performance score/i)).toBeVisible();
    await expect(page.getByText(/\d+\/100/)).toBeVisible();

    // Verify profile completion percentage
    await expect(page.getByText(/profile completion/i)).toBeVisible();
    await expect(page.getByText(/\d+%/)).toBeVisible();

    // Verify commitment summary stats
    await expect(page.getByText(/total commitments/i)).toBeVisible();
    await expect(page.getByText(/delivered/i)).toBeVisible();
  });

  test('shows urgent commitments with proper styling', async ({ page }) => {
    // Look for urgent commitments (those due within 3 days)
    const urgentBadge = page.getByText(/urgent/i);
    
    if (await urgentBadge.count() > 0) {
      // Verify urgent styling is applied
      const urgentCard = urgentBadge.locator('..').locator('..');
      await expect(urgentCard).toHaveClass(/border-orange-200/);
      await expect(urgentCard).toHaveClass(/bg-orange-50/);
    }
  });

  test('handles empty commitment list gracefully', async ({ page }) => {
    // If no commitments exist, should show empty state
    const emptyMessage = page.getByText(/no commitments found/i);
    
    if (await emptyMessage.count() > 0) {
      await expect(emptyMessage).toBeVisible();
      await expect(page.getByText(/create your first commitment/i)).toBeVisible();
    }
  });

  test('form auto-save persists across page refreshes', async ({ page }) => {
    // Navigate to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Fill form partially
    await page.getByLabel(/quantity/i).fill('300');
    await page.getByLabel(/unit/i).fill('blankets');
    await page.getByLabel(/notes/i).fill('Emergency blankets for winter');

    // Wait for auto-save
    await page.waitForTimeout(3000);

    // Refresh page
    await page.reload();

    // Navigate back to new commitment tab
    await page.getByRole('tab', { name: /new commitment/i }).click();

    // Verify data is restored
    await expect(page.getByLabel(/quantity/i)).toHaveValue('300');
    await expect(page.getByLabel(/unit/i)).toHaveValue('blankets');
    await expect(page.getByLabel(/notes/i)).toHaveValue('Emergency blankets for winter');
  });
});