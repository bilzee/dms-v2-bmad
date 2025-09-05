import { test, expect, Page } from '@playwright/test';

// Mock data for testing
const testUser = {
  name: 'Test User',
  email: 'testuser@example.com',
  phone: '+1234567890',
  organization: 'Test Organization',
  roles: ['ASSESSOR']
};

const testUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1111111111',
    organization: 'Relief Org',
    isActive: true,
    roles: [{ name: 'ASSESSOR' }],
    createdAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+2222222222',
    organization: 'Emergency Response',
    isActive: false,
    roles: [{ name: 'COORDINATOR' }],
    createdAt: '2023-01-02T00:00:00Z'
  }
];

test.describe('User Management E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage, context }) => {
    page = testPage;

    // Mock authentication
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Mock API responses
    await page.route('/api/v1/admin/users', async route => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              users: testUsers,
              pagination: {
                total: 2,
                page: 1,
                limit: 10,
                totalPages: 1
              }
            }
          })
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-new',
                ...testUser,
                isActive: true,
                roles: [{ name: 'ASSESSOR' }],
                createdAt: new Date().toISOString()
              }
            },
            message: 'User created successfully'
          })
        });
      }
    });

    await page.route('/api/v1/admin/roles', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            roles: [
              { id: 'role-1', name: 'ASSESSOR', permissions: [] },
              { id: 'role-2', name: 'COORDINATOR', permissions: [] },
              { id: 'role-3', name: 'RESPONDER', permissions: [] },
              { id: 'role-4', name: 'DONOR', permissions: [] },
              { id: 'role-5', name: 'ADMIN', permissions: [] }
            ]
          }
        })
      });
    });

    // Navigate to admin users page
    await page.goto('/admin/users');
  });

  test('should display user management dashboard', async () => {
    // Check page title and navigation
    await expect(page.getByText('User Management')).toBeVisible();
    await expect(page.getByText('Manage system users and their permissions')).toBeVisible();

    // Check statistics cards
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Active Users')).toBeVisible();
    await expect(page.getByText('Recent Users')).toBeVisible();
    await expect(page.getByText('Admin Users')).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: /create user/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /bulk import/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export users/i })).toBeVisible();
  });

  test('should display users list with filters', async () => {
    // Wait for users to load
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('jane@example.com')).toBeVisible();

    // Check filter controls
    await expect(page.getByPlaceholder('Search users...')).toBeVisible();
    await expect(page.getByText('All Roles')).toBeVisible();
    await expect(page.getByText('All Status')).toBeVisible();

    // Check user status badges
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Inactive')).toBeVisible();
  });

  test('should search users', async () => {
    // Wait for initial load
    await expect(page.getByText('John Doe')).toBeVisible();

    // Mock search API response
    await page.route('/api/v1/admin/users?search=john*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            users: [testUsers[0]], // Only John Doe
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
          }
        })
      });
    });

    // Perform search
    const searchInput = page.getByPlaceholder('Search users...');
    await searchInput.fill('john');
    await searchInput.press('Enter');

    // Should only show John Doe
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
  });

  test('should filter users by role', async () => {
    // Mock filtered API response
    await page.route('/api/v1/admin/users?role=ASSESSOR*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            users: [testUsers[0]],
            pagination: { total: 1, page: 1, limit: 10, totalPages: 1 }
          }
        })
      });
    });

    // Use role filter
    await page.getByText('All Roles').click();
    await page.getByText('ASSESSOR').click();

    // Should filter results
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).not.toBeVisible();
  });

  test('should create new user successfully', async () => {
    // Click create user button
    await page.getByRole('button', { name: /create user/i }).click();

    // Modal should open
    await expect(page.getByText('Create New User')).toBeVisible();

    // Fill form
    await page.getByLabel('Full Name').fill(testUser.name);
    await page.getByLabel('Email').fill(testUser.email);
    await page.getByLabel('Phone (Optional)').fill(testUser.phone);
    await page.getByLabel('Organization (Optional)').fill(testUser.organization);

    // Select role
    await page.getByRole('combobox').click();
    await page.getByText('ASSESSOR').click();

    // Submit form
    await page.getByRole('button', { name: /create user/i }).click();

    // Should show success message
    await expect(page.getByText('User created successfully')).toBeVisible();

    // Modal should close
    await expect(page.getByText('Create New User')).not.toBeVisible();
  });

  test('should validate form fields in create user modal', async () => {
    await page.getByRole('button', { name: /create user/i }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: /create user/i }).click();

    // Should show validation errors
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('At least one role must be selected')).toBeVisible();
  });

  test('should edit user', async () => {
    // Mock individual user API response
    await page.route('/api/v1/admin/users/user-1', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { user: testUsers[0] }
          })
        });
      } else if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                ...testUsers[0],
                name: 'John Smith Updated',
                organization: 'Updated Organization'
              }
            },
            message: 'User updated successfully'
          })
        });
      }
    });

    // Click edit button for first user
    await page.getByLabelText('Edit user John Doe').click();

    // Modal should open with pre-filled data
    await expect(page.getByText('Edit User')).toBeVisible();
    await expect(page.getByDisplayValue('John Doe')).toBeVisible();

    // Update fields
    await page.getByLabel('Full Name').clear();
    await page.getByLabel('Full Name').fill('John Smith Updated');
    
    await page.getByLabel('Organization (Optional)').clear();
    await page.getByLabel('Organization (Optional)').fill('Updated Organization');

    // Submit form
    await page.getByRole('button', { name: /update user/i }).click();

    // Should show success message
    await expect(page.getByText('User updated successfully')).toBeVisible();
  });

  test('should toggle user status', async () => {
    // Mock status update API
    await page.route('/api/v1/admin/users/user-1/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { ...testUsers[0], isActive: false }
          },
          message: 'User deactivated successfully'
        })
      });
    });

    // Click deactivate button for active user
    await page.getByRole('button', { name: /deactivate/i }).first().click();

    // Confirmation dialog should appear
    await expect(page.getByText('Confirm Action')).toBeVisible();
    await expect(page.getByText('Are you sure you want to deactivate this user?')).toBeVisible();

    // Confirm action
    await page.getByRole('button', { name: /continue/i }).click();

    // Should show success message
    await expect(page.getByText('User deactivated successfully')).toBeVisible();
  });

  test('should handle bulk import workflow', async () => {
    // Mock bulk import validation
    await page.route('/api/v1/admin/users/bulk-import', async route => {
      const formData = await route.request().formData();
      const validateOnly = formData.get('validateOnly');

      if (validateOnly === 'true') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              preview: {
                validRows: 2,
                invalidRows: 0,
                errors: [],
                sampleUsers: [
                  { name: 'User 1', email: 'user1@example.com', roleIds: ['ASSESSOR'] },
                  { name: 'User 2', email: 'user2@example.com', roleIds: ['COORDINATOR'] }
                ]
              }
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              successfulRows: 2,
              failedRows: 0,
              importId: 'import-123'
            }
          })
        });
      }
    });

    // Click bulk import button
    await page.getByRole('button', { name: /bulk import/i }).click();

    // Modal should open
    await expect(page.getByText('Bulk Import Users')).toBeVisible();

    // Upload CSV file
    const csvContent = `name,email,phone,organization,roles,isActive
User 1,user1@example.com,+1111111111,Org 1,ASSESSOR,true
User 2,user2@example.com,+2222222222,Org 2,COORDINATOR,true`;

    const fileInput = page.getByLabel('CSV File');
    await fileInput.setInputFiles({
      name: 'test-users.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    // Validate file
    await page.getByRole('button', { name: /validate file/i }).click();

    // Should show validation progress
    await expect(page.getByText('Validating File')).toBeVisible();

    // Should show preview
    await expect(page.getByText('Import Preview')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible(); // Valid users count

    // Process import
    await page.getByRole('button', { name: /import 2 users/i }).click();

    // Should show processing
    await expect(page.getByText('Processing Import')).toBeVisible();

    // Should show completion
    await expect(page.getByText('Import Completed!')).toBeVisible();
    await expect(page.getByText('Users have been successfully imported')).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByText('Bulk Import Users')).not.toBeVisible();
  });

  test('should handle bulk import with validation errors', async () => {
    // Mock bulk import with errors
    await page.route('/api/v1/admin/users/bulk-import', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            preview: {
              validRows: 1,
              invalidRows: 1,
              errors: [
                {
                  row: 2,
                  field: 'email',
                  value: 'invalid-email',
                  error: 'Invalid email format'
                }
              ],
              sampleUsers: [
                { name: 'User 1', email: 'user1@example.com', roleIds: ['ASSESSOR'] }
              ]
            }
          }
        })
      });
    });

    await page.getByRole('button', { name: /bulk import/i }).click();

    const csvContent = `name,email,phone,organization,roles,isActive
User 1,user1@example.com,+1111111111,Org 1,ASSESSOR,true
User 2,invalid-email,+2222222222,Org 2,COORDINATOR,true`;

    await page.getByLabel('CSV File').setInputFiles({
      name: 'test-users-errors.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent)
    });

    await page.getByRole('button', { name: /validate file/i }).click();

    // Should show validation errors
    await expect(page.getByText('Validation Errors')).toBeVisible();
    await expect(page.getByText('Invalid email format')).toBeVisible();
    await expect(page.getByText('1')).toBeVisible(); // Invalid rows count
  });

  test('should export users data', async () => {
    // Mock export API
    await page.route('/api/v1/admin/users/export', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/csv',
        body: 'name,email,phone,organization,roles,isActive\nJohn Doe,john@example.com,+1111111111,Relief Org,ASSESSOR,true',
        headers: {
          'Content-Disposition': 'attachment; filename="users-export.csv"'
        }
      });
    });

    // Setup download handler
    const downloadPromise = page.waitForEvent('download');
    
    await page.getByRole('button', { name: /export users/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('users-export.csv');
  });

  test('should handle API errors gracefully', async () => {
    // Mock API error
    await page.route('/api/v1/admin/users', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await page.goto('/admin/users');

    // Should show error message
    await expect(page.getByText('Failed to load users')).toBeVisible();
  });

  test('should handle responsive design on mobile', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to page
    await page.goto('/admin/users');

    // Check mobile layout
    await expect(page.getByText('User Management')).toBeVisible();
    
    // Statistics cards should stack vertically
    const statsCards = page.locator('[data-testid="stats-card"]');
    if (await statsCards.count() > 0) {
      // Cards should be visible but in mobile layout
      await expect(statsCards.first()).toBeVisible();
    }

    // Table should switch to card view on mobile
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('should maintain user session and handle logout', async () => {
    // Initial state should be logged in
    await expect(page.getByText('User Management')).toBeVisible();

    // Mock logout
    await page.route('/api/auth/signout', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/login' })
      });
    });

    // Simulate session expiry or logout
    await page.context().clearCookies();
    await page.reload();

    // Should redirect to login or show authentication required
    // This depends on your authentication setup
  });
});