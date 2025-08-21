import { renderHook, act } from '@testing-library/react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useGPS } from '@/hooks/useGPS';
import { db } from '@/lib/offline/db';
import { generateUUID } from '@dms/shared';

// Mock dependencies
jest.mock('@/hooks/useGPS');
jest.mock('@/lib/offline/db');
jest.mock('@dms/shared', () => ({
  ...jest.requireActual('@dms/shared'),
  generateUUID: jest.fn(),
}));

// Mock getUserMedia
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock canvas and image for compression
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
  })) as any,
  toBlob: jest.fn((callback) => callback(new Blob(['test'], { type: 'image/jpeg' }))),
};
global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext as any;
Object.defineProperty(global.HTMLCanvasElement.prototype, 'toBlob', {
  value: mockCanvas.toBlob,
});

const mockUseGPS = useGPS as jest.MockedFunction<typeof useGPS>;
const mockDb = db as jest.Mocked<typeof db>;
const mockGenerateUUID = generateUUID as jest.MockedFunction<typeof generateUUID>;

describe('useMediaUpload Hook', () => {
  const mockGPSCoordinates = {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 10,
    timestamp: new Date(),
    captureMethod: 'GPS' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to ensure clean state
    mockUseGPS.mockImplementation(() => ({
      coordinates: mockGPSCoordinates,
      isLoading: false,
      error: null,
      accuracy: 10,
      captureLocation: jest.fn().mockResolvedValue(mockGPSCoordinates),
      clearCoordinates: jest.fn(),
      isSupported: true,
    }));

    mockGenerateUUID.mockReturnValue('test-uuid');
    
    // Ensure db methods return proper values
    mockDb.compressMedia = jest.fn().mockResolvedValue(new Blob(['compressed'], { type: 'image/jpeg' }));
    mockDb.generateThumbnail = jest.fn().mockResolvedValue(new Blob(['thumbnail'], { type: 'image/jpeg' }));
    mockDb.saveMediaAttachment = jest.fn().mockResolvedValue('saved-id');
    mockDb.addToQueue = jest.fn().mockResolvedValue('queue-id');
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();
    expect(result.current.mediaFiles).toEqual([]);
    expect(result.current.isCapturing).toBe(false);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles camera capture successfully', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
    };
    
    let onloadedCallback: (() => void) | null = null;
    const mockVideo = {
      srcObject: null,
      play: jest.fn().mockResolvedValue(undefined),
      videoWidth: 1920,
      videoHeight: 1080,
      set onloadedmetadata(callback: () => void) {
        onloadedCallback = callback;
        // Simulate immediate loading for test
        setTimeout(callback, 0);
      },
      get onloadedmetadata() {
        return onloadedCallback || (() => {});
      }
    };
    
    // Mock document.createElement for video
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'video') {
        return mockVideo as any;
      }
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return originalCreateElement.call(document, tagName);
    });

    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useMediaUpload());
    
    await act(async () => {
      await result.current.captureFromCamera();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    expect(result.current.mediaFiles).toHaveLength(1);
    expect(result.current.mediaFiles[0].mimeType).toBe('image/jpeg');
    expect(result.current.isCapturing).toBe(false);
    
    // Restore document.createElement
    document.createElement = originalCreateElement;
  }, 15000);

  it('handles camera capture errors', async () => {
    const error = new Error('Camera access denied');
    mockGetUserMedia.mockRejectedValue(error);

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();
    
    await act(async () => {
      await result.current.captureFromCamera();
    });

    expect(result.current.error).toBe('Camera access denied');
    expect(result.current.mediaFiles).toHaveLength(0);
    expect(result.current.isCapturing).toBe(false);
  });

  it('validates file size and type', async () => {
    const { result } = renderHook(() => useMediaUpload({
      maxFileSize: 1024, // 1KB limit
      acceptedTypes: ['image/jpeg'],
    }));

    expect(result.current).toBeDefined();

    const largeFile = new File(['x'.repeat(2048)], 'large.jpg', { type: 'image/jpeg' });
    const wrongTypeFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    const fileList = {
      length: 2,
      0: largeFile,
      1: wrongTypeFile,
    } as unknown as FileList;

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    // Should reject both files due to size and type
    expect(result.current.mediaFiles).toHaveLength(0);
  });

  it('compresses large images', async () => {
    const largeImageFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    const fileList = {
      length: 1,
      0: largeImageFile,
    } as unknown as FileList;

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    expect(mockDb.compressMedia).toHaveBeenCalledWith(
      largeImageFile,
      5 * 1024 * 1024 // Default max file size
    );
    expect(mockDb.generateThumbnail).toHaveBeenCalledWith(largeImageFile, 150);
    expect(result.current.mediaFiles).toHaveLength(1);
  });

  it('removes files correctly', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    expect(result.current.mediaFiles).toHaveLength(1);
    const fileId = result.current.mediaFiles[0].id;

    act(() => {
      result.current.removeFile(fileId);
    });

    expect(result.current.mediaFiles).toHaveLength(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('clears all files', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    expect(result.current.mediaFiles).toHaveLength(1);

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.mediaFiles).toHaveLength(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('uploads files to database and queue', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;
    const assessmentId = 'test-assessment';

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    await act(async () => {
      await result.current.uploadFiles(assessmentId);
    });

    expect(mockDb.saveMediaAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-uuid',
        mimeType: 'image/jpeg',
      }),
      assessmentId
    );

    expect(mockDb.addToQueue).toHaveBeenCalledWith({
      type: 'MEDIA',
      action: 'CREATE',
      entityId: 'test-uuid',
      data: expect.objectContaining({
        id: 'test-uuid',
        assessmentId,
      }),
      retryCount: 0,
      priority: 'NORMAL',
      createdAt: expect.any(Date),
    });

    expect(result.current.mediaFiles).toHaveLength(0); // Should clear after upload
  });

  it('handles upload errors', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;

    mockDb.saveMediaAttachment.mockRejectedValue(new Error('Database error'));

    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    await act(async () => {
      await result.current.uploadFiles();
    });

    expect(result.current.error).toBe('Database error');
    expect(result.current.isUploading).toBe(false);
  });

  it('respects maximum file limit', async () => {
    const { result } = renderHook(() => useMediaUpload({ maxFiles: 2 }));
    
    expect(result.current).toBeDefined();
    
    const files = Array.from({ length: 3 }, (_, i) => 
      new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
    );
    
    const fileList = {
      length: 3,
      0: files[0],
      1: files[1],
      2: files[2],
    } as unknown as FileList;

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    expect(result.current.mediaFiles).toHaveLength(2);
    expect(result.current.error).toContain('Maximum 2 files allowed');
  });

  it('retries upload for failed files', async () => {
    const { result } = renderHook(() => useMediaUpload());
    
    expect(result.current).toBeDefined();
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    const fileId = result.current.mediaFiles[0].id;

    await act(async () => {
      await result.current.retryUpload(fileId);
    });

    expect(mockDb.addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'MEDIA',
        action: 'CREATE',
        entityId: fileId,
        priority: 'HIGH', // Higher priority for retries
      })
    );
  });

  it('captures GPS coordinates automatically when enabled', async () => {
    const mockCaptureLocation = jest.fn().mockResolvedValue(mockGPSCoordinates);
    mockUseGPS.mockReturnValue({
      coordinates: mockGPSCoordinates,
      isLoading: false,
      error: null,
      accuracy: 10,
      captureLocation: mockCaptureLocation,
      clearCoordinates: jest.fn(),
      isSupported: true,
    });

    const { result } = renderHook(() => useMediaUpload({ autoGPS: true }));
    
    expect(result.current).toBeDefined();
    
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileList = { length: 1, 0: file } as unknown as FileList;

    await act(async () => {
      await result.current.selectFiles(fileList);
    });

    expect(mockCaptureLocation).toHaveBeenCalled();
    expect(result.current.mediaFiles[0].metadata?.gpsCoordinates).toEqual(mockGPSCoordinates);
  });
});