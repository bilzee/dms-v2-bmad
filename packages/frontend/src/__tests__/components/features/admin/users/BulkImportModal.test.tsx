import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkImportModal } from '@/components/features/admin/users/BulkImportModal';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock CSV file creation
const createMockFile = (content: string, filename: string = 'users.csv') => {
  return new File([content], filename, { type: 'text/csv' });
};

describe('BulkImportModal Component', () => {
  beforeEach(() => {
    mockToast.mockClear();
    jest.clearAllMocks();
  });

  const mockProps = {
    open: true,
    onClose: jest.fn(),
    onSuccess: jest.fn()
  };

  it('renders upload step initially', () => {
    render(<BulkImportModal {...mockProps} />);

    expect(screen.getByText('Bulk Import Users')).toBeInTheDocument();
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
    expect(screen.getByText('Select a CSV file containing user data to import')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download template/i })).toBeInTheDocument();
  });

  it('shows CSV format requirements', () => {
    render(<BulkImportModal {...mockProps} />);

    expect(screen.getByText('CSV Format Requirements:')).toBeInTheDocument();
    expect(screen.getByText(/Headers: name, email, phone, organization, roles, isActive/)).toBeInTheDocument();
    expect(screen.getByText(/Roles should be comma-separated/)).toBeInTheDocument();
    expect(screen.getByText(/Email addresses must be unique/)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<BulkImportModal {...mockProps} />);

    const csvContent = 'name,email,phone,organization,roles,isActive\nJohn Doe,john@example.com,+123456789,Org,ASSESSOR,true';
    const file = createMockFile(csvContent);

    const fileInput = screen.getByLabelText('CSV File');
    
    // Create a mock FileList
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Selected: users.csv (72 B)')).toBeInTheDocument();
    });
  });

  it('validates file type', async () => {
    render(<BulkImportModal {...mockProps} />);

    const textFile = new File(['not csv'], 'document.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText('CSV File');
    
    Object.defineProperty(fileInput, 'files', {
      value: [textFile],
      writable: false,
    });

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid File',
        description: 'Please select a valid CSV file.',
        variant: 'destructive'
      });
    });
  });

  it('handles file validation successfully', async () => {
    const validationResponse = {
      success: true,
      data: {
        preview: {
          validRows: 2,
          invalidRows: 0,
          errors: [],
          sampleUsers: [
            { name: 'John Doe', email: 'john@example.com', organization: 'Org', roleIds: ['ASSESSOR'] },
            { name: 'Jane Smith', email: 'jane@example.com', organization: 'Org2', roleIds: ['COORDINATOR'] }
          ]
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validationResponse
    } as Response);

    render(<BulkImportModal {...mockProps} />);

    const csvContent = 'name,email,phone,organization,roles,isActive\nJohn Doe,john@example.com,+123456789,Org,ASSESSOR,true';
    const file = createMockFile(csvContent);

    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click validate
    const validateButton = screen.getByRole('button', { name: /validate file/i });
    fireEvent.click(validateButton);

    // Should show validation step
    await waitFor(() => {
      expect(screen.getByText('Validating File')).toBeInTheDocument();
    });

    // Should show preview step with results
    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Valid users count
      expect(screen.getByText('0')).toBeInTheDocument(); // Invalid rows count
    });
  });

  it('displays validation errors', async () => {
    const validationResponse = {
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
            { name: 'John Doe', email: 'john@example.com', organization: 'Org', roleIds: ['ASSESSOR'] }
          ]
        }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validationResponse
    } as Response);

    render(<BulkImportModal {...mockProps} />);

    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('processes import successfully', async () => {
    const validationResponse = {
      success: true,
      data: {
        preview: {
          validRows: 2,
          invalidRows: 0,
          errors: [],
          sampleUsers: []
        }
      }
    };

    const importResponse = {
      success: true,
      data: {
        successfulRows: 2,
        failedRows: 0,
        importId: 'import-123'
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validationResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => importResponse
      } as Response);

    render(<BulkImportModal {...mockProps} />);

    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
    });

    // Click import
    const importButton = screen.getByRole('button', { name: /import 2 users/i });
    fireEvent.click(importButton);

    // Should show processing step
    await waitFor(() => {
      expect(screen.getByText('Processing Import')).toBeInTheDocument();
    });

    // Should show completed step
    await waitFor(() => {
      expect(screen.getByText('Import Completed!')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Users created count
    });
  });

  it('handles import with errors', async () => {
    const validationResponse = {
      success: true,
      data: {
        preview: {
          validRows: 2,
          invalidRows: 0,
          errors: [],
          sampleUsers: []
        }
      }
    };

    const importResponse = {
      success: true,
      data: {
        successfulRows: 1,
        failedRows: 1,
        importId: 'import-123'
      }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validationResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => importResponse
      } as Response);

    render(<BulkImportModal {...mockProps} />);

    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      const importButton = screen.getByRole('button', { name: /import 2 users/i });
      fireEvent.click(importButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Import Completed!')).toBeInTheDocument();
      // Check both successful and failed counts
      const successfulText = screen.getByText('1');
      const failedText = screen.getByText('1');
      expect(successfulText).toBeInTheDocument();
      expect(failedText).toBeInTheDocument();
    });
  });

  it('handles API errors during validation', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<BulkImportModal {...mockProps} />);

    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Validation Error',
        description: 'Network error',
        variant: 'destructive'
      });
    });

    // Should return to upload step
    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
  });

  it('downloads CSV template', () => {
    // Mock URL.createObjectURL and related methods
    const mockURL = {
      createObjectURL: jest.fn(() => 'mock-blob-url'),
      revokeObjectURL: jest.fn()
    };
    global.URL = mockURL as any;

    const mockLink = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

    render(<BulkImportModal {...mockProps} />);

    const downloadButton = screen.getByRole('button', { name: /download template/i });
    fireEvent.click(downloadButton);

    expect(mockURL.createObjectURL).toHaveBeenCalled();
    expect(mockLink.download).toBe('user-import-template.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('handles modal close at different steps', () => {
    render(<BulkImportModal {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('calls onSuccess when closing after completion', async () => {
    const validationResponse = {
      success: true,
      data: {
        preview: { validRows: 1, invalidRows: 0, errors: [], sampleUsers: [] }
      }
    };

    const importResponse = {
      success: true,
      data: { successfulRows: 1, failedRows: 0, importId: 'import-123' }
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => validationResponse
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => importResponse
      } as Response);

    render(<BulkImportModal {...mockProps} />);

    // Go through the full flow
    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      const importButton = screen.getByRole('button', { name: /import 1 users/i });
      fireEvent.click(importButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Import Completed!')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockProps.onSuccess).toHaveBeenCalled();
  });

  it('allows going back from preview to upload', async () => {
    const validationResponse = {
      success: true,
      data: {
        preview: { validRows: 1, invalidRows: 0, errors: [], sampleUsers: [] }
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => validationResponse
    } as Response);

    render(<BulkImportModal {...mockProps} />);

    const file = createMockFile('test content');
    const fileInput = screen.getByLabelText('CSV File');
    Object.defineProperty(fileInput, 'files', { value: [file], writable: false });

    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /validate file/i }));

    await waitFor(() => {
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
  });
});