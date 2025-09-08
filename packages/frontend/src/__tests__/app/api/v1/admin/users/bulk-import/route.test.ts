import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/admin/users/bulk-import/route';
import DatabaseService from '@/lib/services/DatabaseService';
import { getToken } from 'next-auth/jwt';

jest.mock('@/lib/services/DatabaseService');
jest.mock('next-auth/jwt');

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;

// Mock CSV data
const validCSVContent = `name,email,phone,organization,roles,isActive
John Doe,john@example.com,+1234567890,Relief Org,ASSESSOR,true
Jane Smith,jane@example.com,+0987654321,Emergency Response,COORDINATOR,true
Bob Wilson,bob@example.com,,Health Services,RESPONDER,false`;

const invalidCSVContent = `name,email,phone,organization,roles,isActive
John Doe,invalid-email,+1234567890,Relief Org,ASSESSOR,true
,jane@example.com,+0987654321,Emergency Response,COORDINATOR,true
Bob Wilson,bob@example.com,,Health Services,INVALID_ROLE,false`;

describe('/api/v1/admin/users/bulk-import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockReset();
    
    // Mock admin token for successful requests
    mockGetToken.mockResolvedValue({
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'ADMIN'
    } as any);
  });

  describe('POST /api/v1/admin/users/bulk-import', () => {
    it('should validate CSV file and return preview (validateOnly=true)', async () => {
      const mockRoles = [
        { 
          id: 'role-1', 
          name: 'ASSESSOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 5 }
        },
        { 
          id: 'role-2', 
          name: 'COORDINATOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 3 }
        },
        { 
          id: 'role-3', 
          name: 'RESPONDER', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 8 }
        }
      ];

      mockDatabaseService.getAllRoles.mockResolvedValue(mockRoles);

      const formData = new FormData();
      const file = new File([validCSVContent], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('validateOnly', 'true');

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preview).toBeDefined();
      expect(data.data.preview.validRows).toBe(3);
      expect(data.data.preview.invalidRows).toBe(0);
      expect(data.data.preview.errors).toHaveLength(0);
      expect(data.data.preview.sampleUsers).toHaveLength(3);
    });

    it('should identify validation errors in CSV data', async () => {
      const mockRoles = [
        { 
          id: 'role-1', 
          name: 'ASSESSOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 5 }
        },
        { 
          id: 'role-2', 
          name: 'COORDINATOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 3 }
        },
        { 
          id: 'role-3', 
          name: 'RESPONDER', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 8 }
        }
      ];

      mockDatabaseService.getAllRoles.mockResolvedValue(mockRoles);

      const formData = new FormData();
      const file = new File([invalidCSVContent], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);
      formData.append('validateOnly', 'true');

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.preview.validRows).toBe(0);
      expect(data.data.preview.invalidRows).toBe(3);
      expect(data.data.preview.errors).toHaveLength(3);
      
      // Check specific validation errors
      const errors = data.data.preview.errors;
      expect(errors.some((e: any) => e.field === 'email' && e.error.includes('Invalid email'))).toBe(true);
      expect(errors.some((e: any) => e.field === 'name' && e.error.includes('required'))).toBe(true);
      expect(errors.some((e: any) => e.field === 'roles' && e.error.includes('Invalid role'))).toBe(true);
    });

    it('should process valid CSV import successfully', async () => {
      const mockRoles = [
        { 
          id: 'role-1', 
          name: 'ASSESSOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 5 }
        },
        { 
          id: 'role-2', 
          name: 'COORDINATOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 3 }
        },
        { 
          id: 'role-3', 
          name: 'RESPONDER', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 8 }
        }
      ];

      const mockImportRecord = {
        id: 'import-123',
        fileName: 'users.csv',
        fileSize: 1024,
        totalRows: 3,
        processedRows: 3,
        successfulRows: 3,
        failedRows: 0,
        status: 'COMPLETED',
        errors: [],
        importedBy: 'admin-1',
        importedByName: 'Admin User',
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T10:05:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:05:00Z')
      };

      mockDatabaseService.getAllRoles.mockResolvedValue(mockRoles);
      mockDatabaseService.createBulkImport.mockResolvedValue(mockImportRecord);
      mockDatabaseService.createUserWithAdmin.mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: null,
        image: null,
        phone: null,
        organization: 'Test Org',
        isActive: true,
        resetToken: null,
        resetTokenExpiry: null,
        activeRoleId: 'role-1',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        lastSync: null,
        requirePasswordReset: false,
        activeRole: {
          id: 'role-1',
          name: 'ASSESSOR',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          isActive: true
        },
        roles: [{
          id: 'role-1',
          name: 'ASSESSOR',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          isActive: true,
          permissions: []
        }]
      });
      mockDatabaseService.updateBulkImportProgress.mockResolvedValue(mockImportRecord);

      const formData = new FormData();
      const file = new File([validCSVContent], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.successfulRows).toBe(3);
      expect(data.data.failedRows).toBe(0);
      expect(data.data.importId).toBe('import-123');
      
      // Verify that users were created
      expect(mockDatabaseService.createUserWithAdmin).toHaveBeenCalledTimes(3);
    });

    it('should handle partial import with errors', async () => {
      const mixedCSVContent = `name,email,phone,organization,roles,isActive
John Doe,john@example.com,+1234567890,Relief Org,ASSESSOR,true
,invalid@email,+0987654321,Emergency Response,COORDINATOR,true
Bob Wilson,bob@example.com,,Health Services,RESPONDER,false`;

      const mockRoles = [
        { 
          id: 'role-1', 
          name: 'ASSESSOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 5 }
        },
        { 
          id: 'role-2', 
          name: 'COORDINATOR', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 3 }
        },
        { 
          id: 'role-3', 
          name: 'RESPONDER', 
          isActive: true, 
          createdAt: new Date('2023-01-01'), 
          updatedAt: new Date('2023-01-01'),
          permissions: [],
          _count: { users: 8 }
        }
      ];

      const mockImportRecord = {
        id: 'import-456',
        fileName: 'users.csv',
        fileSize: 1024,
        totalRows: 3,
        processedRows: 3,
        successfulRows: 2,
        failedRows: 1,
        status: 'COMPLETED',
        errors: [{ row: 2, field: 'name', error: 'Name is required' }],
        importedBy: 'admin-1',
        importedByName: 'Admin User',
        startedAt: new Date('2023-01-01T10:00:00Z'),
        completedAt: new Date('2023-01-01T10:05:00Z'),
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:05:00Z')
      };

      mockDatabaseService.getAllRoles.mockResolvedValue(mockRoles);
      mockDatabaseService.createBulkImport.mockResolvedValue(mockImportRecord);
      
      // First user succeeds
      mockDatabaseService.createUserWithAdmin
        .mockResolvedValueOnce({
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          emailVerified: null,
          image: null,
          phone: '+1234567890',
          organization: 'Relief Org',
          isActive: true,
          resetToken: null,
          resetTokenExpiry: null,
          activeRoleId: 'role-1',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          lastSync: null,
          requirePasswordReset: false,
          activeRole: {
            id: 'role-1',
            name: 'ASSESSOR',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            isActive: true
          },
          roles: [{
            id: 'role-1',
            name: 'ASSESSOR',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            isActive: true,
            permissions: []
          }]
        })
        // Second user fails (validation error)
        .mockRejectedValueOnce(new Error('Name is required'))
        // Third user succeeds
        .mockResolvedValueOnce({
          id: 'user-3',
          name: 'Bob Wilson',
          email: 'bob@example.com',
          emailVerified: null,
          image: null,
          phone: null,
          organization: 'Health Services',
          isActive: false,
          resetToken: null,
          resetTokenExpiry: null,
          activeRoleId: 'role-3',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          lastSync: null,
          requirePasswordReset: false,
          activeRole: {
            id: 'role-3',
            name: 'RESPONDER',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            isActive: true
          },
          roles: [{
            id: 'role-3',
            name: 'RESPONDER',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            isActive: true,
            permissions: []
          }]
        });

      mockDatabaseService.updateBulkImportProgress.mockResolvedValue(mockImportRecord);

      const formData = new FormData();
      const file = new File([mixedCSVContent], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.successfulRows).toBe(2);
      expect(data.data.failedRows).toBe(1);
    });

    it('should reject non-CSV files', async () => {
      const formData = new FormData();
      const file = new File(['not csv content'], 'document.txt', { type: 'text/plain' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid file type. Please upload a CSV file.');
    });

    it('should handle missing file', async () => {
      const formData = new FormData();
      // No file attached

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('No file provided');
    });

    it('should handle CSV parsing errors', async () => {
      const malformedCSV = `name,email,phone
John Doe,john@example.com
Jane Smith,jane@example.com,+123,"extra,quote"`;

      const formData = new FormData();
      const file = new File([malformedCSV], 'malformed.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to parse CSV file');
    });

    it('should handle database connection errors', async () => {
      mockDatabaseService.getAllRoles.mockRejectedValue(new Error('Database connection failed'));

      const formData = new FormData();
      const file = new File([validCSVContent], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process bulk import');
    });

    it('should validate CSV headers', async () => {
      const invalidHeadersCSV = `username,email_address,mobile
John Doe,john@example.com,+1234567890`;

      const formData = new FormData();
      const file = new File([invalidHeadersCSV], 'users.csv', { type: 'text/csv' });
      formData.append('file', file);

      const request = new NextRequest('http://localhost/api/v1/admin/users/bulk-import', {
        method: 'POST',
        body: formData
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid CSV headers');
    });
  });
});