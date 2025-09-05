import { NextRequest, NextResponse } from 'next/server';
import DatabaseService from '@/lib/services/DatabaseService';
import { CreateUserRequest } from '../../../../../../../shared/types/admin';
import { z } from 'zod';
import { parse as csvParse } from 'csv-parse/sync';
import { requireAdminRole, getCurrentUser } from '@/lib/auth-middleware';
// Force this route to be dynamic
export const dynamic = 'force-dynamic';

// Validation schema for CSV row
const csvUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  organization: z.string().optional(),
  roles: z.string().min(1, 'At least one role is required'), // Comma-separated role names
  isActive: z.string().optional()
});


async function parseCSVFile(file: File): Promise<any[]> {
  const text = await file.text();
  
  try {
    const records = csvParse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    return records;
  } catch (error) {
    throw new Error(`Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown parsing error'}`);
  }
}

async function validateAndProcessUsers(records: any[], roleMap: Map<string, string>): Promise<{
  validUsers: CreateUserRequest[];
  errors: Array<{ row: number; field: string; value: string; error: string }>;
}> {
  const validUsers: CreateUserRequest[] = [];
  const errors: Array<{ row: number; field: string; value: string; error: string }> = [];
  const emailSet = new Set<string>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowNumber = i + 2; // Account for header row and 0-based index

    try {
      // Validate basic fields
      const validationResult = csvUserSchema.safeParse(record);
      
      if (!validationResult.success) {
        for (const error of validationResult.error.errors) {
          errors.push({
            row: rowNumber,
            field: error.path.join('.'),
            value: record[error.path[0]] || '',
            error: error.message
          });
        }
        continue;
      }

      const validData = validationResult.data;

      // Check for duplicate emails within the CSV
      if (emailSet.has(validData.email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          value: validData.email,
          error: 'Duplicate email within CSV file'
        });
        continue;
      }
      emailSet.add(validData.email);

      // Parse and validate roles
      const roleNames = validData.roles.split(',').map(r => r.trim().toUpperCase());
      const roleIds: string[] = [];
      const invalidRoles: string[] = [];

      for (const roleName of roleNames) {
        const roleId = roleMap.get(roleName);
        if (roleId) {
          roleIds.push(roleId);
        } else {
          invalidRoles.push(roleName);
        }
      }

      if (invalidRoles.length > 0) {
        errors.push({
          row: rowNumber,
          field: 'roles',
          value: invalidRoles.join(', '),
          error: `Invalid role names: ${invalidRoles.join(', ')}`
        });
        continue;
      }

      if (roleIds.length === 0) {
        errors.push({
          row: rowNumber,
          field: 'roles',
          value: validData.roles,
          error: 'No valid roles found'
        });
        continue;
      }

      // Create user object
      const user: CreateUserRequest = {
        name: validData.name,
        email: validData.email,
        phone: validData.phone || undefined,
        organization: validData.organization || undefined,
        roleIds,
        isActive: validData.isActive ? validData.isActive.toLowerCase() !== 'false' : true
      };

      validUsers.push(user);

    } catch (error) {
      errors.push({
        row: rowNumber,
        field: 'general',
        value: JSON.stringify(record),
        error: error instanceof Error ? error.message : 'Unknown validation error'
      });
    }
  }

  return { validUsers, errors };
}

// POST /api/v1/admin/users/bulk-import - Bulk user import from CSV
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const authError = await requireAdminRole(request);
    if (authError) return authError;

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const validateOnly = formData.get('validateOnly') === 'true';

    if (!file || file.type !== 'text/csv') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file',
        message: 'Please provide a valid CSV file',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Parse CSV
    const records = await parseCSVFile(file);
    
    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Empty file',
        message: 'CSV file contains no data rows',
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Get role mapping for validation
    const roles = await DatabaseService.getAllRoles();
    const roleMap = new Map<string, string>();
    for (const role of roles) {
      roleMap.set(role.name.toUpperCase(), role.id);
    }

    // Validate and process users
    const { validUsers, errors } = await validateAndProcessUsers(records, roleMap);

    // If validation only, return preview
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'VALIDATION_COMPLETE',
          preview: {
            validRows: validUsers.length,
            invalidRows: errors.length,
            sampleUsers: validUsers.slice(0, 5), // Show first 5 valid users as preview
            errors: errors.slice(0, 20) // Show first 20 errors
          }
        },
        message: 'Validation completed successfully',
        timestamp: new Date().toISOString(),
      });
    }

    // Check for existing emails in database
    const existingEmailCheck = await Promise.all(
      validUsers.map(async (user, index) => {
        const existing = await DatabaseService.listUsers({ search: user.email });
        if (existing.users.length > 0) {
          return {
            row: index + 2, // Account for header and 0-based index
            field: 'email',
            value: user.email,
            error: 'Email already exists in database'
          };
        }
        return null;
      })
    );

    const dbEmailErrors = existingEmailCheck.filter(e => e !== null);
    if (dbEmailErrors.length > 0) {
      errors.push(...dbEmailErrors);
    }

    // If there are any errors, don't proceed with import
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        message: `Found ${errors.length} validation errors`,
        data: {
          errors: errors.slice(0, 50) // Limit error response size
        },
        timestamp: new Date().toISOString(),
      }, { status: 400 });
    }

    // Create bulk import record
    const currentUserId = 'temp-admin-id'; // TODO: Get from session
    const currentUserName = 'Temp Admin'; // TODO: Get from session

    const bulkImport = await DatabaseService.createBulkImport({
      fileName: file.name,
      fileSize: file.size,
      totalRows: validUsers.length,
      importedBy: currentUserId,
      importedByName: currentUserName
    });

    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const processingErrors: any[] = [];

    for (let i = 0; i < validUsers.length; i += batchSize) {
      const batch = validUsers.slice(i, i + batchSize);
      
      for (const userData of batch) {
        try {
          await DatabaseService.createUserWithAdmin({
            ...userData,
            createdBy: currentUserId,
            createdByName: currentUserName
          });
          successCount++;
        } catch (error) {
          failedCount++;
          processingErrors.push({
            row: i + 2, // Approximate row number
            email: userData.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
        processedCount++;

        // Update progress
        await DatabaseService.updateBulkImportProgress(bulkImport.id, {
          processedRows: processedCount,
          successfulRows: successCount,
          failedRows: failedCount,
          errors: processingErrors
        });
      }
    }

    // Mark import as completed
    await DatabaseService.updateBulkImportProgress(bulkImport.id, {
      status: failedCount === 0 ? 'COMPLETED' : 'FAILED',
      processedRows: processedCount,
      successfulRows: successCount,
      failedRows: failedCount,
      errors: processingErrors
    });

    return NextResponse.json({
      success: true,
      data: {
        importId: bulkImport.id,
        status: 'PROCESSING',
        summary: {
          totalRows: validUsers.length,
          processedRows: processedCount,
          successfulRows: successCount,
          failedRows: failedCount
        }
      },
      message: `Bulk import completed. Successfully imported ${successCount} users.`,
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Bulk import failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Bulk import failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}