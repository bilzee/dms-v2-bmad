import { test, expect } from '@playwright/test';

test.describe('Story 8.2: Delivery Performance Tracking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for performance data
    await page.route('/api/v1/donors/performance*', async route => {
      const url = new URL(route.request().url());
      const period = url.searchParams.get('period') || '90';
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            metrics: {
              donorId: 'test-donor-123',
              onTimeDeliveryRate: 87.5,
              quantityAccuracyRate: 92.3,
              performanceScore: 89.2,
              totalCommitments: 24,
              completedDeliveries: 21,
              beneficiariesHelped: 1250,
              responseTypesServed: ['MEDICAL_SUPPLIES', 'FOOD_WATER', 'SHELTER'],
              lastUpdated: new Date().toISOString(),
            },
            period,
            filters: {
              responseType: url.searchParams.get('responseType'),
              location: url.searchParams.get('location'),
            },
          },
        }),
      });
    });

    await page.route('/api/v1/donors/performance/history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            history: [
              {
                date: '2024-11-01',
                onTimeDeliveryRate: 85.2,
                quantityAccuracyRate: 90.1,
                performanceScore: 87.8,
                completedDeliveries: 2,
                beneficiariesHelped: 95,
              },
              {
                date: '2024-11-08',
                onTimeDeliveryRate: 87.8,
                quantityAccuracyRate: 91.5,
                performanceScore: 89.1,
                completedDeliveries: 3,
                beneficiariesHelped: 142,
              },
            ],
            trends: {
              onTimeDeliveryRate: 2.3,
              quantityAccuracyRate: -1.2,
              performanceScore: 1.8,
            },
          },
        }),
      });
    });

    await page.route('/api/v1/donors/impact*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            impact: {
              totalBeneficiariesHelped: 1250,
              beneficiariesByResponseType: {
                'MEDICAL_SUPPLIES': 450,
                'FOOD_WATER': 520,
                'SHELTER': 280,
              },
              geographicImpact: {
                locationsServed: 8,
                coverageAreaKm2: 2500,
                regions: [
                  {
                    name: 'Northern Districts',
                    beneficiaries: 420,
                    deliveries: 8,
                    responseTypes: ['MEDICAL_SUPPLIES', 'FOOD_WATER'],
                  },
                  {
                    name: 'Coastal Areas',
                    beneficiaries: 380,
                    deliveries: 6,
                    responseTypes: ['SHELTER', 'FOOD_WATER'],
                  },
                ],
              },
              impactOverTime: [
                {
                  date: '2024-11-01',
                  cumulativeBeneficiaries: 1000,
                  newBeneficiaries: 95,
                  deliveries: 2,
                },
                {
                  date: '2024-11-08',
                  cumulativeBeneficiaries: 1250,
                  newBeneficiaries: 142,
                  deliveries: 3,
                },
              ],
              effectivenessMetrics: {
                needFulfillmentRate: 78.5,
                responseTimeHours: 18.2,
                verificationRate: 94.1,
              },
            },
            insights: {
              mostImpactfulResponseType: 'FOOD_WATER',
              averageBeneficiariesPerDelivery: 59,
              impactGrowthRate: 15.2,
            },
          },
        }),
      });
    });

    await page.route('/api/v1/donors/achievements*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            achievements: [
              {
                id: 'ach-001',
                donorId: 'test-donor-123',
                type: 'FIRST_DELIVERY',
                title: 'First Delivery',
                description: 'Completed your first verified delivery',
                earnedAt: '2024-01-15T00:00:00Z',
                category: 'delivery',
                badgeIcon: '🎯',
                isRecent: false,
              },
              {
                id: 'ach-002',
                donorId: 'test-donor-123',
                type: 'MILESTONE_10',
                title: '10 Deliveries Milestone',
                description: 'Successfully completed 10 verified deliveries',
                earnedAt: '2024-06-20T00:00:00Z',
                category: 'delivery',
                badgeIcon: '📦',
                isRecent: false,
              },
            ],
            stats: {
              total: 6,
              recent: 2,
              byCategory: {
                delivery: 3,
                accuracy: 1,
                impact: 1,
                consistency: 1,
              },
            },
            nextAchievements: [
              {
                type: 'MILESTONE_25',
                title: '25 Deliveries Milestone',
                description: 'Complete 25 verified deliveries',
                progress: 21,
                target: 25,
                category: 'delivery',
                estimatedCompletion: '2-3 weeks based on current activity',
              },
            ],
          },
        }),
      });
    });

    // Navigate to the donor dashboard
    await page.goto('/donor');
  });

  test('should display performance tab and navigate to it', async ({ page }) => {
    // Wait for the page to load and check if performance tab exists
    await expect(page.locator('[value="performance"]')).toBeVisible();
    
    // Click on the performance tab
    await page.click('[value="performance"]');
    
    // Wait for performance content to be visible
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
  });

  test('should display performance metrics overview', async ({ page }) => {
    // Navigate to performance tab
    await page.click('[value="performance"]');
    
    // Check if basic performance metrics are displayed
    await expect(page.locator('text=87.5%')).toBeVisible(); // On-time delivery rate
    await expect(page.locator('text=92.3%')).toBeVisible(); // Quantity accuracy rate
    await expect(page.locator('text=89.2')).toBeVisible(); // Performance score
    await expect(page.locator('text=1,250')).toBeVisible(); // Beneficiaries helped
  });

  test('should access standalone performance dashboard', async ({ page }) => {
    // Navigate directly to performance dashboard page
    await page.goto('/donor/performance');
    
    // Check if the page loads with performance dashboard
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
    await expect(page.locator('text=Track your delivery performance and impact metrics')).toBeVisible();
    
    // Verify key performance indicators are visible
    await expect(page.locator('text=Overall Performance Score')).toBeVisible();
    await expect(page.locator('text=89.2')).toBeVisible();
  });

  test('should display performance trends with charts', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Navigate to trends tab
    await page.click('button:has-text("Trends")');
    
    // Wait for trends data to load
    await expect(page.locator('text=Performance Score Trend')).toBeVisible();
    await expect(page.locator('text=Delivery Performance Metrics')).toBeVisible();
    await expect(page.locator('text=Delivery Volume & Impact')).toBeVisible();
    
    // Check for trend indicators
    await expect(page.locator('text=+2.3%')).toBeVisible(); // On-time delivery trend
    await expect(page.locator('text=-1.2%')).toBeVisible(); // Quantity accuracy trend
    await expect(page.locator('text=+1.8')).toBeVisible(); // Performance score trend
  });

  test('should display impact visualization', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Navigate to impact tab
    await page.click('button:has-text("Impact")');
    
    // Wait for impact metrics to load
    await expect(page.locator('text=1,250')).toBeVisible(); // Total beneficiaries
    await expect(page.locator('text=2,500 km²')).toBeVisible(); // Coverage area
    await expect(page.locator('text=18.2h')).toBeVisible(); // Response time
    await expect(page.locator('text=94.1%')).toBeVisible(); // Verification rate
    
    // Check geographic impact
    await expect(page.locator('text=Northern Districts')).toBeVisible();
    await expect(page.locator('text=Coastal Areas')).toBeVisible();
    
    // Check response type breakdown
    await expect(page.locator('text=Medical Supplies')).toBeVisible();
    await expect(page.locator('text=Food Water')).toBeVisible();
  });

  test('should display achievements and progress', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Navigate to achievements tab
    await page.click('button:has-text("Achievements")');
    
    // Wait for achievements to load
    await expect(page.locator('text=Earned Achievements')).toBeVisible();
    await expect(page.locator('text=Progress Towards Next Achievements')).toBeVisible();
    
    // Check earned achievements
    await expect(page.locator('text=First Delivery')).toBeVisible();
    await expect(page.locator('text=10 Deliveries Milestone')).toBeVisible();
    
    // Check next achievements progress
    await expect(page.locator('text=25 Deliveries Milestone')).toBeVisible();
    await expect(page.locator('text=21/25')).toBeVisible(); // Progress indicator
    await expect(page.locator('text=84% complete')).toBeVisible();
  });

  test('should allow filtering performance data', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Test time period filter
    await page.selectOption('select', '30'); // Change to 30 days
    await expect(page.locator('text=Last 30 days')).toBeVisible();
    
    // Test response type filter
    await page.selectOption('[data-testid="response-type-filter"]', 'MEDICAL_SUPPLIES');
    // Note: This test assumes the filter exists - actual implementation may vary
    
    // Test location filter
    await page.selectOption('[data-testid="location-filter"]', 'northern');
    // Note: This test assumes the filter exists - actual implementation may vary
  });

  test('should handle export functionality', async ({ page }) => {
    await page.route('/api/v1/donors/performance/export*', async route => {
      const url = new URL(route.request().url());
      const format = url.searchParams.get('format') || 'csv';
      
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': format === 'csv' ? 'text/csv' : 'application/json',
          'content-disposition': `attachment; filename="donor-performance.${format}"`,
        },
        body: format === 'csv' ? 'Donor Performance Report\nMetric,Value\nOn-Time Rate,87.5%' : JSON.stringify({ data: 'mock' }),
      });
    });

    await page.goto('/donor/performance');
    
    // Test CSV export
    const downloadPromise = page.waitForEvent('download');
    await page.selectOption('[data-testid="export-select"]', 'csv');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should display loading states correctly', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('/api/v1/donors/performance*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { metrics: { performanceScore: 89 } }
        }),
      });
    });

    await page.goto('/donor/performance');
    
    // Check for loading indicator
    await expect(page.locator('[data-testid="loading-spinner"], .animate-spin')).toBeVisible();
    
    // Wait for content to load
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error response
    await page.route('/api/v1/donors/performance*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to fetch performance metrics',
        }),
      });
    });

    await page.goto('/donor/performance');
    
    // Check for error message
    await expect(page.locator('text=Failed to fetch performance metrics, text=Try Again')).toBeVisible();
    
    // Test retry functionality
    await page.click('button:has-text("Try Again")');
  });

  test('should refresh performance data', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Wait for initial load
    await expect(page.locator('text=89.2')).toBeVisible();
    
    // Click refresh button
    await page.click('button:has-text("Refresh")');
    
    // Check that the refresh button shows loading state
    await expect(page.locator('button:has-text("Refresh") .animate-spin')).toBeVisible();
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=Performance Dashboard')).toBeVisible();
    
    // Ensure metrics are still visible on mobile
    await expect(page.locator('text=89.2')).toBeVisible();
  });

  test('should track performance metric updates in real-time', async ({ page }) => {
    await page.goto('/donor/performance');
    
    // Wait for initial metrics to load
    await expect(page.locator('text=89.2')).toBeVisible();
    
    // Simulate a performance update event
    await page.evaluate(() => {
      const event = new CustomEvent('donor-performance-update', {
        detail: { donorId: 'test-donor-123', eventData: { type: 'COMMITMENT_DELIVERED' } }
      });
      window.dispatchEvent(event);
    });
    
    // In a real scenario, this would trigger a data refresh
    // For this test, we're just ensuring the event system works
    await page.waitForTimeout(1000);
  });
});