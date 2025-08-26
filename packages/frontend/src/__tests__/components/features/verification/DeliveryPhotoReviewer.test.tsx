import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveryPhotoReviewer from '@/components/features/verification/DeliveryPhotoReviewer';
import { RapidResponse, MediaAttachment, ResponseType, ResponseStatus, VerificationStatus } from '@dms/shared';

// Mock fetch for photo loading
global.fetch = jest.fn();

describe('DeliveryPhotoReviewer', () => {
  const mockPhotos: MediaAttachment[] = [
    {
      id: 'photo-1',
      url: 'https://example.com/photo1.jpg',
      localPath: null,
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      mimeType: 'image/jpeg',
      size: 1024000,
      metadata: {
        gps: { latitude: 12.345, longitude: 67.890, accuracy: 10 },
        timestamp: '2025-01-15T14:30:00Z',
        deviceInfo: { model: 'iPhone 12', os: 'iOS 15' }
      },
      syncStatus: 'SYNCED',
      createdAt: new Date('2025-01-15T14:30:00Z')
    },
    {
      id: 'photo-2',
      url: 'https://example.com/photo2.jpg',
      localPath: null,
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      mimeType: 'image/jpeg',
      size: 2048000,
      metadata: {
        gps: { latitude: 12.346, longitude: 67.891, accuracy: 25 },
        timestamp: '2025-01-15T14:35:00Z',
        deviceInfo: { model: 'Samsung S21', os: 'Android 12' }
      },
      syncStatus: 'SYNCED',
      createdAt: new Date('2025-01-15T14:35:00Z')
    }
  ];

  const mockResponse: RapidResponse = {
    id: 'response-1',
    responseType: ResponseType.FOOD,
    status: ResponseStatus.DELIVERED,
    plannedDate: new Date('2025-01-15T10:00:00Z'),
    deliveredDate: new Date('2025-01-15T14:30:00Z'),
    affectedEntityId: 'entity-1',
    assessmentId: 'assessment-1',
    responderId: 'responder-1',
    responderName: 'John Smith',
    donorId: 'donor-1',
    donorName: 'Red Cross',
    verificationStatus: VerificationStatus.PENDING,
    syncStatus: 'SYNCED',
    data: { items: ['rice', 'beans'], quantity: 100 },
    createdAt: new Date('2025-01-15T08:00:00Z'),
    updatedAt: new Date('2025-01-15T14:30:00Z'),
    deliveryEvidence: mockPhotos
  };

  const mockOnVerificationComplete = jest.fn();
  const mockOnNotesChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { photos: mockPhotos }
      })
    });
  });

  describe('Component Rendering', () => {
    it('renders photo reviewer with photos', async () => {
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      expect(screen.getByText('Delivery Photo Review')).toBeInTheDocument();
      expect(screen.getByText('2 photos')).toBeInTheDocument();
    });

    it('shows loading state while fetching photos', () => {
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));

      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      expect(screen.getByText('Loading photos...')).toBeInTheDocument();
    });

    it('handles no photos case', async () => {
      const responseWithoutPhotos = {
        ...mockResponse,
        deliveryEvidence: []
      };

      render(
        <DeliveryPhotoReviewer
          response={responseWithoutPhotos}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No delivery photos available')).toBeInTheDocument();
      });
    });

    it('displays photo thumbnails with metadata', async () => {
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        const photo1 = screen.getByAltText('Delivery photo 1');
        expect(photo1).toBeInTheDocument();
        expect(photo1).toHaveAttribute('src', 'https://example.com/thumb1.jpg');

        const photo2 = screen.getByAltText('Delivery photo 2');
        expect(photo2).toBeInTheDocument();
        expect(photo2).toHaveAttribute('src', 'https://example.com/thumb2.jpg');
      });

      // Check GPS accuracy indicators
      expect(screen.getByText('10m')).toBeInTheDocument(); // GPS accuracy for photo 1
      expect(screen.getByText('25m')).toBeInTheDocument(); // GPS accuracy for photo 2
    });
  });

  describe('Photo Verification', () => {
    it('allows individual photo verification', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click on first photo to select it
      const photo1 = screen.getByAltText('Delivery photo 1');
      await user.click(photo1);

      // Verify the photo
      const verifyButton = screen.getByText('Verify Selected');
      await user.click(verifyButton);

      // Check that photo is marked as verified
      await waitFor(() => {
        expect(screen.getByLabelText('Photo verified')).toBeInTheDocument();
      });
    });

    it('allows batch photo verification', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('2 photos')).toBeInTheDocument();
      });

      // Select all photos
      const selectAllCheckbox = screen.getByLabelText('Select all photos');
      await user.click(selectAllCheckbox);

      // Verify all selected photos
      const verifyAllButton = screen.getByText('Verify All Selected');
      await user.click(verifyAllButton);

      // Check that all photos are verified and verification complete is called
      await waitFor(() => {
        expect(mockOnVerificationComplete).toHaveBeenCalledWith(true);
      });
    });

    it('shows quality scoring sliders for selected photos', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click on first photo to select it
      const photo1 = screen.getByAltText('Delivery photo 1');
      await user.click(photo1);

      // Quality and relevance scoring should appear
      expect(screen.getByText('Quality Score')).toBeInTheDocument();
      expect(screen.getByText('Relevance Score')).toBeInTheDocument();
    });

    it('validates GPS accuracy and shows warnings', async () => {
      const responseWithInaccurateGPS = {
        ...mockResponse,
        deliveryEvidence: [
          {
            ...mockPhotos[0],
            metadata: {
              ...mockPhotos[0].metadata,
              gps: { latitude: 12.345, longitude: 67.890, accuracy: 150 } // High inaccuracy
            }
          }
        ]
      };

      render(
        <DeliveryPhotoReviewer
          response={responseWithInaccurateGPS}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('150m')).toBeInTheDocument();
        expect(screen.getByText('Low GPS accuracy')).toBeInTheDocument();
      });
    });
  });

  describe('Photo Annotation', () => {
    it('allows adding notes to individual photos', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
          onNotesChange={mockOnNotesChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click on first photo to select it
      const photo1 = screen.getByAltText('Delivery photo 1');
      await user.click(photo1);

      // Add notes to the photo
      const notesInput = screen.getByPlaceholderText('Add verification notes...');
      await user.type(notesInput, 'Clear photo showing food distribution');

      expect(mockOnNotesChange).toHaveBeenCalledWith('Clear photo showing food distribution');
    });

    it('opens full-size photo viewer', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click zoom button to open full viewer
      const zoomButtons = screen.getAllByLabelText('View full size');
      await user.click(zoomButtons[0]);

      // Photo viewer dialog should open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Photo Details')).toBeInTheDocument();
    });
  });

  describe('GPS and Metadata Validation', () => {
    it('displays comprehensive metadata information', async () => {
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click on first photo to view metadata
      const photo1 = screen.getByAltText('Delivery photo 1');
      await userEvent.click(photo1);

      // Should show location coordinates
      expect(screen.getByText(/12\.345, 67\.890/)).toBeInTheDocument();
      
      // Should show timestamp
      expect(screen.getByText(/2025-01-15/)).toBeInTheDocument();
      
      // Should show device info
      expect(screen.getByText(/iPhone 12/)).toBeInTheDocument();
    });

    it('validates timestamp accuracy against delivery time', async () => {
      const responseWithEarlyPhoto = {
        ...mockResponse,
        deliveryEvidence: [
          {
            ...mockPhotos[0],
            metadata: {
              ...mockPhotos[0].metadata,
              timestamp: '2025-01-15T10:00:00Z' // Before delivery started
            }
          }
        ]
      };

      render(
        <DeliveryPhotoReviewer
          response={responseWithEarlyPhoto}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Timestamp issue')).toBeInTheDocument();
      });
    });

    it('shows location verification with map preview', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Click on first photo
      const photo1 = screen.getByAltText('Delivery photo 1');
      await user.click(photo1);

      // Should show map button or location link
      expect(screen.getByText(/12\.345, 67\.890/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles photo loading errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading photos')).toBeInTheDocument();
      });
    });

    it('handles missing metadata gracefully', async () => {
      const responseWithIncompleteMetadata = {
        ...mockResponse,
        deliveryEvidence: [
          {
            ...mockPhotos[0],
            metadata: null // Missing metadata
          }
        ]
      };

      render(
        <DeliveryPhotoReviewer
          response={responseWithIncompleteMetadata}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No metadata')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('lazy loads photo thumbnails', async () => {
      const manyPhotos = Array.from({ length: 20 }, (_, i) => ({
        ...mockPhotos[0],
        id: `photo-${i}`,
        url: `https://example.com/photo${i}.jpg`,
        thumbnailUrl: `https://example.com/thumb${i}.jpg`
      }));

      const responseWithManyPhotos = {
        ...mockResponse,
        deliveryEvidence: manyPhotos
      };

      render(
        <DeliveryPhotoReviewer
          response={responseWithManyPhotos}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('20 photos')).toBeInTheDocument();
      });

      // Should initially load only visible thumbnails
      const visiblePhotos = screen.getAllByRole('img');
      expect(visiblePhotos.length).toBeLessThan(20); // Assuming lazy loading
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for photo controls', async () => {
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select photo 1')).toBeInTheDocument();
        expect(screen.getByLabelText('Select photo 2')).toBeInTheDocument();
        expect(screen.getByLabelText('Select all photos')).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <DeliveryPhotoReviewer
          response={mockResponse}
          onVerificationComplete={mockOnVerificationComplete}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('Delivery photo 1')).toBeInTheDocument();
      });

      // Should be able to navigate photos with keyboard
      const photo1 = screen.getByAltText('Delivery photo 1');
      photo1.focus();
      
      await user.keyboard('{Enter}');
      expect(photo1.closest('.border-blue-500')).toBeInTheDocument(); // Selected state
    });
  });
});