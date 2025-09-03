import { test, expect } from '@playwright/test';

test.describe('Story 8.3: Verification-Based Achievement System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and setup test environment
    await page.route('**/api/v1/auth/session', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            user: {
              id: 'donor-test-123',
              name: 'Test Donor',
              role: 'DONOR',
              email: 'test.donor@example.com'
            }
          }
        }
      });
    });

    // Mock donor profile
    await page.route('**/api/v1/donors/profile', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            profile: {
              id: 'donor-test-123',
              name: 'Test Donor',
              organization: 'Test Relief Org',
              email: 'test.donor@example.com'
            }
          }
        }
      });
    });

    // Mock donor achievements API
    await page.route('**/api/v1/donors/achievements**', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            achievements: [
              {
                id: 'ach-test-1',
                donorId: 'donor-test-123',
                type: 'FIRST_VERIFIED_DELIVERY',
                title: 'Verified Contributor',
                description: 'Your first delivery has been verified by coordinators',
                category: 'DELIVERY',
                badgeIcon: '✅',
                isUnlocked: true,
                unlockedAt: new Date().toISOString(),
              }
            ],
            summary: {
              total: 1,
              recent: 1,
              categories: { DELIVERY: 1 }
            }
          }
        }
      });
    });

    // Mock leaderboard API
    await page.route('**/api/v1/donors/leaderboard**', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            leaderboard: [
              {
                donorId: 'donor-1',
                donorName: 'Top Donor',
                donorOrganization: 'Best Relief Org',
                achievements: 20,
                verifiedDeliveries: 35,
                verificationRate: 98,
                totalBeneficiaries: 200,
                score: 95,
                recentAchievements: [
                  { title: 'Impact Champion', icon: '🏆', earnedAt: new Date() }
                ],
                isCurrentUser: false
              },
              {
                donorId: 'donor-test-123',
                donorName: 'Test Donor',
                donorOrganization: 'Test Relief Org',
                achievements: 5,
                verifiedDeliveries: 8,
                verificationRate: 90,
                totalBeneficiaries: 50,
                score: 72,
                recentAchievements: [],
                isCurrentUser: true
              }
            ],
            currentUserRank: 2,
            metadata: {
              category: 'OVERALL',
              timeframe: '90',
              totalParticipants: 2,
              generatedAt: new Date().toISOString()
            }
          }
        }
      });
    });
  });

  test('donor can view verification-based achievements', async ({ page }) => {
    await page.goto('/dashboard/donor/achievements');
    
    // Verify achievement display
    await expect(page.getByText('Verified Contributor')).toBeVisible();
    await expect(page.getByText('Your first delivery has been verified by coordinators')).toBeVisible();
    await expect(page.getByText('✅')).toBeVisible();
  });

  test('coordinator can generate verification stamps that trigger achievements', async ({ page }) => {
    // Mock coordinator authentication
    await page.route('**/api/v1/auth/session', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            user: {
              id: 'coordinator-123',
              name: 'Test Coordinator',
              role: 'COORDINATOR',
              email: 'coordinator@example.com'
            }
          }
        }
      });
    });

    // Mock verification stamp generation
    await page.route('**/api/v1/verification/responses/*/stamp', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            stamp: {
              responseId: 'response-456',
              verificationId: 'verification-123',
              stampGeneratedAt: new Date().toISOString(),
              stampGeneratedBy: 'coordinator-123'
            },
            achievementResults: [
              {
                donorId: 'donor-123',
                donorName: 'Test Donor',
                newAchievements: [
                  {
                    id: 'ach-new',
                    title: 'Quality Streak',
                    description: '5 consecutive verified deliveries',
                    badgeIcon: '🔥'
                  }
                ]
              }
            ]
          },
          message: 'Verification stamp generated and achievements calculated for 1 donor(s)'
        }
      });
    });

    await page.goto('/monitoring/responses/response-456');
    
    // Generate verification stamp
    await page.getByRole('button', { name: /generate verification stamp/i }).click();
    
    // Verify success message
    await expect(page.getByText(/verification stamp generated/i)).toBeVisible();
    await expect(page.getByText(/achievements calculated for 1 donor/i)).toBeVisible();
  });

  test('leaderboard displays verification-based rankings', async ({ page }) => {
    await page.goto('/dashboard/donor/leaderboard');

    // Verify leaderboard display
    await expect(page.getByText('Achievement Leaderboard')).toBeVisible();
    await expect(page.getByText('Top Donor')).toBeVisible();
    await expect(page.getByText('Test Donor')).toBeVisible();
    
    // Verify current user highlighting
    await expect(page.getByText('You')).toBeVisible();
    
    // Verify metrics display
    await expect(page.getByText('95')).toBeVisible(); // Top donor score
    await expect(page.getByText('72')).toBeVisible(); // Current user score
    await expect(page.getByText('98%')).toBeVisible(); // Top donor verification rate
  });

  test('achievement notifications appear on verification', async ({ page }) => {
    // Mock achievement calculation
    await page.route('**/api/v1/donors/achievements/calculate', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            newAchievements: [
              {
                id: 'ach-new',
                title: 'Health Specialist',
                description: '10+ verified health service deliveries',
                badgeIcon: '🏥',
                category: 'SPECIALIZATION',
                unlockedAt: new Date().toISOString()
              }
            ],
            totalAchievements: 6,
            achievementsEarned: 1
          },
          message: 'Congratulations! You earned 1 new achievement!'
        }
      });
    });

    await page.goto('/dashboard/donor');
    
    // Trigger achievement calculation (simulate verification event)
    await page.evaluate(() => {
      const event = new CustomEvent('donor-achievement-earned', {
        detail: {
          achievements: [
            {
              id: 'ach-new',
              title: 'Health Specialist',
              description: '10+ verified health service deliveries',
              badgeIcon: '🏥',
              category: 'SPECIALIZATION',
              unlockedAt: new Date().toISOString()
            }
          ],
          responseId: 'response-456',
          verificationId: 'verification-789'
        }
      });
      window.dispatchEvent(event);
    });

    // Verify notification appears
    await expect(page.getByText('Achievement Unlocked!')).toBeVisible();
    await expect(page.getByText('Health Specialist')).toBeVisible();
    await expect(page.getByText('10+ verified health service deliveries')).toBeVisible();
    await expect(page.getByText('🏥')).toBeVisible();
  });

  test('verification stamp displays donor achievements', async ({ page }) => {
    await page.goto('/monitoring/responses/response-456');

    // Verify verification stamp is displayed
    await expect(page.getByText('Response Verified')).toBeVisible();
    await expect(page.getByText('Verified by: Test Coordinator')).toBeVisible();
    
    // Verify achievements are shown if present
    await expect(page.getByText('Achievements Earned')).toBeVisible();
    await expect(page.getByText('✅ Verified Contributor')).toBeVisible();

    // Test certificate generation
    await page.getByRole('button', { name: /generate certificate/i }).click();
    // Certificate download would be tested with actual file download verification
  });

  test('leaderboard category filtering works correctly', async ({ page }) => {
    await page.goto('/dashboard/donor/leaderboard');

    // Test category filtering
    await page.getByRole('button', { name: /verification/i }).click();
    
    // Verify API call with correct parameters
    await page.waitForRequest(request => 
      request.url().includes('category=VERIFICATION')
    );

    // Test timeframe filtering
    await page.getByRole('button', { name: /this year/i }).click();
    
    await page.waitForRequest(request => 
      request.url().includes('timeframe=year')
    );
  });

  test('privacy controls for leaderboard work correctly', async ({ page }) => {
    await page.goto('/dashboard/donor/leaderboard');

    // Test privacy toggle
    const privacySwitch = page.getByRole('switch');
    await privacySwitch.click();
    
    // Verify API call includes privacy parameter
    await page.waitForRequest(request => 
      request.url().includes('includePrivate=true')
    );

    await expect(page.getByText('Show All')).toBeVisible();
  });

  test('donor can navigate to achievements via sidebar', async ({ page }) => {
    await page.goto('/dashboard/donor');
    
    // Find and click achievements menu item in sidebar
    await page.getByRole('link', { name: /achievements/i }).click();
    
    // Verify navigation succeeded
    await expect(page).toHaveURL('/dashboard/donor/achievements');
    await expect(page.getByText('Achievement Center')).toBeVisible();
  });

  test('donor can navigate to leaderboard via sidebar', async ({ page }) => {
    await page.goto('/dashboard/donor');
    
    // Find and click leaderboard menu item in sidebar
    await page.getByRole('link', { name: /leaderboard/i }).click();
    
    // Verify navigation succeeded
    await expect(page).toHaveURL('/dashboard/donor/leaderboard');
    await expect(page.getByText('Achievement Leaderboard')).toBeVisible();
  });
});