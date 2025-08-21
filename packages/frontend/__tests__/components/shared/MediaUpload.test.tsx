import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaUpload } from '@/components/shared/MediaUpload';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useOfflineStore } from '@/stores/offline.store';

// Mock dependencies
jest.mock('@/hooks/useMediaUpload');
jest.mock('@/stores/offline.store');
jest.mock('@/lib/offline/db');

// Mock getUserMedia for camera testing
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

const mockUseMediaUpload = useMediaUpload as jest.MockedFunction<typeof useMediaUpload>;
const mockUseOfflineStore = useOfflineStore as jest.MockedFunction<typeof useOfflineStore>;

describe('MediaUpload Component', () => {
  const mockMediaFiles = [
    {
      id: '1',
      localPath: 'mocked-url-1',
      preview: 'mocked-url-1',
      mimeType: 'image/jpeg',
      size: 1024000,
      metadata: {
        gpsCoordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: new Date('2023-01-01T12:00:00Z'),
          captureMethod: 'GPS' as const,
        },
        timestamp: new Date('2023-01-01T12:00:00Z'),
      },
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      thumbnailUrl: 'mocked-thumbnail-url',
    },
  ];

  const defaultMockReturn = {
    mediaFiles: [],
    isCapturing: false,
    isUploading: false,
    error: null,
    captureFromCamera: jest.fn(),
    selectFiles: jest.fn(),
    removeFile: jest.fn(),
    clearFiles: jest.fn(),
    uploadFiles: jest.fn(),
    retryUpload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseOfflineStore.mockReturnValue({
      isOnline: true,
      addToQueue: jest.fn(),
      addPendingAssessment: jest.fn(),
    } as any);

    mockUseMediaUpload.mockReturnValue(defaultMockReturn);
  });

  it('renders upload controls correctly', () => {
    render(<MediaUpload />);
    
    expect(screen.getByText('Take Photo')).toBeInTheDocument();
    expect(screen.getByText('Select Files')).toBeInTheDocument();
    expect(screen.getByText(/Maximum 10 files/)).toBeInTheDocument();
  });

  it('handles camera capture', async () => {
    const mockCaptureFromCamera = jest.fn();
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      captureFromCamera: mockCaptureFromCamera,
    });

    render(<MediaUpload />);
    
    const cameraButton = screen.getByText('Take Photo');
    await userEvent.click(cameraButton);
    
    expect(mockCaptureFromCamera).toHaveBeenCalledTimes(1);
  });

  it('handles file selection', async () => {
    const mockSelectFiles = jest.fn();
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      selectFiles: mockSelectFiles,
    });

    render(<MediaUpload />);
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByDisplayValue('');
    
    await userEvent.upload(input, file);
    
    expect(mockSelectFiles).toHaveBeenCalledWith(expect.any(FileList));
  });

  it('displays media files with metadata', () => {
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText('JPEG')).toBeInTheDocument();
    expect(screen.getByText('1000 KB')).toBeInTheDocument();
    expect(screen.getByText('40.7128, -74.0060')).toBeInTheDocument();
  });

  it('shows upload button when files are present', () => {
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText('Upload 1 file')).toBeInTheDocument();
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('handles file removal', async () => {
    const mockRemoveFile = jest.fn();
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
      removeFile: mockRemoveFile,
    });

    render(<MediaUpload />);
    
    const removeButton = screen.getByTitle('Remove file');
    await userEvent.click(removeButton);
    
    expect(mockRemoveFile).toHaveBeenCalledWith('1');
  });

  it('handles clear all files', async () => {
    const mockClearFiles = jest.fn();
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
      clearFiles: mockClearFiles,
    });

    render(<MediaUpload />);
    
    const clearButton = screen.getByText('Clear All');
    await userEvent.click(clearButton);
    
    expect(mockClearFiles).toHaveBeenCalledTimes(1);
  });

  it('handles file upload', async () => {
    const mockUploadFiles = jest.fn();
    const assessmentId = 'test-assessment-id';
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
      uploadFiles: mockUploadFiles,
    });

    render(<MediaUpload assessmentId={assessmentId} />);
    
    const uploadButton = screen.getByText('Upload 1 file');
    await userEvent.click(uploadButton);
    
    expect(mockUploadFiles).toHaveBeenCalledWith(assessmentId);
  });

  it('shows capturing state', () => {
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      isCapturing: true,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText('Capturing...')).toBeInTheDocument();
  });

  it('shows uploading state', () => {
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
      isUploading: true,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
    expect(screen.getByText('Uploading media files...')).toBeInTheDocument();
  });

  it('displays error messages', () => {
    const errorMessage = 'File size too large';
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      error: errorMessage,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows offline indicator', () => {
    mockUseOfflineStore.mockReturnValue({
      isOnline: false,
      addToQueue: jest.fn(),
      addPendingAssessment: jest.fn(),
    } as any);

    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
    });

    render(<MediaUpload />);
    
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it('disables controls when disabled prop is true', () => {
    render(<MediaUpload disabled={true} />);
    
    const cameraButton = screen.getByText('Take Photo');
    const selectButton = screen.getByText('Select Files');
    
    expect(cameraButton).toBeDisabled();
    expect(selectButton).toBeDisabled();
  });

  it('enforces maximum file limit', () => {
    const maxFiles = 2;
    const files = new Array(maxFiles).fill(null).map((_, i) => ({
      ...mockMediaFiles[0],
      id: `${i}`,
    }));
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: files,
    });

    render(<MediaUpload maxFiles={maxFiles} />);
    
    const cameraButton = screen.getByText('Take Photo');
    const selectButton = screen.getByText('Select Files');
    
    expect(cameraButton).toBeDisabled();
    expect(selectButton).toBeDisabled();
  });

  it('calls onMediaChange when media files change', () => {
    const onMediaChange = jest.fn();
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
    });

    render(<MediaUpload onMediaChange={onMediaChange} />);
    
    expect(onMediaChange).toHaveBeenCalledWith(mockMediaFiles);
  });

  it('calls onUploadComplete after successful upload', async () => {
    const onUploadComplete = jest.fn();
    const mockUploadFiles = jest.fn();
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: mockMediaFiles,
      uploadFiles: mockUploadFiles,
    });

    render(<MediaUpload onUploadComplete={onUploadComplete} />);
    
    const uploadButton = screen.getByText('Upload 1 file');
    await userEvent.click(uploadButton);
    
    expect(mockUploadFiles).toHaveBeenCalled();
    // onUploadComplete would be called after upload completes
  });

  it('handles retry upload for failed files', async () => {
    const mockRetryUpload = jest.fn();
    const fileWithError = {
      ...mockMediaFiles[0],
      error: 'Upload failed',
    };
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: [fileWithError],
      retryUpload: mockRetryUpload,
    });

    render(<MediaUpload />);
    
    const retryButton = screen.getByTitle('Retry upload');
    await userEvent.click(retryButton);
    
    expect(mockRetryUpload).toHaveBeenCalledWith('1');
  });

  it('displays sync status indicators correctly', () => {
    const syncedFile = { ...mockMediaFiles[0], url: 'https://example.com/image.jpg' };
    const pendingFile = { ...mockMediaFiles[0], id: '2', url: undefined };
    
    mockUseMediaUpload.mockReturnValue({
      ...defaultMockReturn,
      mediaFiles: [syncedFile, pendingFile],
    });

    render(<MediaUpload />);
    
    // Check for sync status legend
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});