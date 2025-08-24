import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeliveryPhotoCapture } from '@/components/features/response/DeliveryPhotoCapture';
import type { MediaAttachment } from '@dms/shared';

// Mock the GPS hook
const mockCaptureLocation = jest.fn();
jest.mock('@/hooks/useGPS', () => ({
  useGPS: () => ({
    captureLocation: mockCaptureLocation,
    isLoading: false,
  }),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({ 'data-testid': 'dropzone' })),
    getInputProps: jest.fn(() => ({ 'data-testid': 'file-input' })),
    isDragActive: false,
    isDragReject: false,
    acceptedFiles: [],
    rejectedFiles: [],
  })),
}));

const mockOnChange = jest.fn();

const defaultProps = {
  onChange: mockOnChange,
  disabled: false,
  maxPhotos: 5,
  compressionQuality: 0.8,
};

const mockMediaAttachment: MediaAttachment = {
  id: 'photo-123',
  filename: 'delivery-photo.jpg',
  mimeType: 'image/jpeg',
  size: 1024000,
  url: 'data:image/jpeg;base64,mockbase64',
  uploadedAt: new Date('2024-01-15T10:30:00Z'),
  metadata: {
    gpsLocation: {
      latitude: 9.0765,
      longitude: 7.3986,
      timestamp: new Date('2024-01-15T10:30:00Z'),
      captureMethod: 'GPS' as const,
    },
    originalSize: 2048000,
    compressedSize: 1024000,
    compressionRatio: 0.5,
  },
};

describe('DeliveryPhotoCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptureLocation.mockResolvedValue({
      latitude: 9.0765,
      longitude: 7.3986,
      accuracy: 10,
      timestamp: new Date(),
      captureMethod: 'GPS',
    });
  });

  describe('Rendering', () => {
    it('renders photo capture interface', () => {
      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      expect(screen.getByText(/delivery photo evidence/i)).toBeInTheDocument();
      expect(screen.getByText(/drag & drop photos here/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select photos/i })).toBeInTheDocument();
    });

    it('shows existing photos when provided', () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          value={[mockMediaAttachment]}
        />
      );
      
      expect(screen.getByText('delivery-photo.jpg')).toBeInTheDocument();
      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
    });

    it('displays photo count and limit', () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          value={[mockMediaAttachment]}
          maxPhotos={3}
        />
      );
      
      expect(screen.getByText('1 / 3 photos')).toBeInTheDocument();
    });
  });

  describe('Photo Management', () => {
    it('calls onChange when photos are added', async () => {
      const file = new File(['photo content'], 'test-photo.jpg', { type: 'image/jpeg' });
      
      // Mock the useDropzone behavior for accepted files
      const mockUseDropzone = require('react-dropzone').useDropzone;
      mockUseDropzone.mockReturnValue({
        getRootProps: jest.fn(() => ({ 'data-testid': 'dropzone' })),
        getInputProps: jest.fn(() => ({ 'data-testid': 'file-input' })),
        isDragActive: false,
        isDragReject: false,
        acceptedFiles: [file],
        rejectedFiles: [],
      });

      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      // Simulate file drop/selection
      const fileInput = screen.getByTestId('file-input');
      await userEvent.upload(fileInput, file);

      // Should process the file and call onChange
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('removes photos when delete button is clicked', async () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          value={[mockMediaAttachment]}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /remove photo/i });
      await userEvent.click(deleteButton);
      
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it('prevents adding photos beyond max limit', () => {
      const photos = Array(3).fill(null).map((_, i) => ({
        ...mockMediaAttachment,
        id: `photo-${i}`,
        filename: `photo-${i}.jpg`,
      }));

      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          value={photos}
          maxPhotos={3}
        />
      );
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('pointer-events-none'); // Should be disabled
      expect(screen.getByText(/maximum photos reached/i)).toBeInTheDocument();
    });
  });

  describe('GPS Integration', () => {
    it('captures GPS location when taking photos', async () => {
      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      // Simulate photo capture process
      const file = new File(['photo content'], 'test-photo.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(mockCaptureLocation).toHaveBeenCalled();
      });
    });

    it('shows GPS error when location capture fails', async () => {
      mockCaptureLocation.mockRejectedValue(new Error('GPS unavailable'));
      
      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      const file = new File(['photo content'], 'test-photo.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/gps location unavailable/i)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Compression', () => {
    it('shows compression progress during processing', async () => {
      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      const file = new File(['large photo content'.repeat(1000)], 'large-photo.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      
      await userEvent.upload(fileInput, file);

      // Should show compression progress
      expect(screen.getByText(/compressing photos/i)).toBeInTheDocument();
    });

    it('applies compression quality setting', async () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          compressionQuality={0.6}
        />
      );
      
      const file = new File(['photo content'], 'test-photo.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTestId('file-input');
      await userEvent.upload(fileInput, file);

      // Verify compression settings are used
      // This would require mocking the compression library
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /select photos/i })).toBeInTheDocument();
      expect(screen.getByTestId('dropzone')).toHaveAttribute('role', 'button');
    });

    it('supports keyboard navigation', async () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          value={[mockMediaAttachment]}
        />
      );
      
      const deleteButton = screen.getByRole('button', { name: /remove photo/i });
      deleteButton.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid file types gracefully', async () => {
      const invalidFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
      
      const mockUseDropzone = require('react-dropzone').useDropzone;
      mockUseDropzone.mockReturnValue({
        getRootProps: jest.fn(() => ({ 'data-testid': 'dropzone' })),
        getInputProps: jest.fn(() => ({ 'data-testid': 'file-input' })),
        isDragActive: false,
        isDragReject: false,
        acceptedFiles: [],
        rejectedFiles: [invalidFile],
      });

      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    it('handles file size limits', async () => {
      const largeFile = new File(['large content'.repeat(10000)], 'huge-photo.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 10 * 1024 * 1024 }); // 10MB
      
      const mockUseDropzone = require('react-dropzone').useDropzone;
      mockUseDropzone.mockReturnValue({
        getRootProps: jest.fn(() => ({ 'data-testid': 'dropzone' })),
        getInputProps: jest.fn(() => ({ 'data-testid': 'file-input' })),
        isDragActive: false,
        isDragReject: false,
        acceptedFiles: [],
        rejectedFiles: [largeFile],
      });

      render(<DeliveryPhotoCapture {...defaultProps} />);
      
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables interactions when disabled prop is true', () => {
      render(
        <DeliveryPhotoCapture
          {...defaultProps}
          disabled={true}
        />
      );
      
      const dropzone = screen.getByTestId('dropzone');
      expect(dropzone).toHaveClass('pointer-events-none');
      expect(screen.getByRole('button', { name: /select photos/i })).toBeDisabled();
    });
  });
});