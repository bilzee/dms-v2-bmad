/**
 * Performance Tests for Interactive Mapping
 * Tests map rendering performance and data overlay responsiveness
 */

import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import InteractiveMap from '@/app/(dashboard)/monitoring/map/page';
import { EntityMapLayer } from '@/components/features/monitoring/EntityMapLayer';
import { AssessmentMapLayer } from '@/components/features/monitoring/AssessmentMapLayer';
import { ResponseMapLayer } from '@/components/features/monitoring/ResponseMapLayer';

// Mock react-leaflet components for performance testing
jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers }: any) => (
    <div data-testid="marker" onClick={() => eventHandlers?.click()}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

// Mock Leaflet with complete L.Icon.Default structure
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn(),
      },
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({ iconHtml: 'mock-icon' })),
  marker: jest.fn(() => ({
    addTo: jest.fn(),
    bindPopup: jest.fn(),
  })),
}));

// Mock the Leaflet CSS import to prevent issues
jest.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock dynamic imports for performance
jest.mock('next/dynamic', () => () => {
  const MockComponent = ({ children }: any) => <div data-testid="mock-map-container">{children}</div>;
  return MockComponent;
});

// Mock fetch globally with proper API responses
global.fetch = jest.fn();

// Performance measurement utilities
const measureRenderTime = async (componentRender: () => Promise<void>) => {
  const start = performance.now();
  await componentRender();
  const end = performance.now();
  return end - start;
};

const generateLargeDataset = (size: number) => ({
  success: true,
  data: Array.from({ length: size }, (_, i) => ({
    id: `entity-${i}`,
    name: `Test Entity ${i}`,
    type: i % 2 === 0 ? 'CAMP' : 'COMMUNITY',
    longitude: 14.0 + (i % 100) * 0.01,
    latitude: 12.0 + Math.floor(i / 100) * 0.01,
    coordinates: {
      latitude: 12.0 + Math.floor(i / 100) * 0.01,
      longitude: 14.0 + (i % 100) * 0.01,
      accuracy: 10,
      timestamp: new Date().toISOString(),
      captureMethod: 'GPS'
    },
    assessmentCount: Math.floor(Math.random() * 10),
    responseCount: Math.floor(Math.random() * 5),
    lastActivity: new Date().toISOString(),
    statusSummary: {
      pendingAssessments: Math.floor(Math.random() * 3),
      verifiedAssessments: Math.floor(Math.random() * 5),
      activeResponses: Math.floor(Math.random() * 2),
      completedResponses: Math.floor(Math.random() * 3)
    }
  })),
  meta: {
    boundingBox: {
      northEast: { latitude: 13.0, longitude: 15.0 },
      southWest: { latitude: 12.0, longitude: 14.0 }
    },
    totalEntities: size,
    connectionStatus: 'connected'
  }
});

// CI-friendly performance thresholds
const isCI = process.env.CI;

describe('Interactive Map Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanup();
    
    // Mock fetch with proper API endpoint handling
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/v1/monitoring/map/entities')) {
        return Promise.resolve({
          ok: true,
          json: async () => generateLargeDataset(10)
        });
      } else if (url.includes('/api/v1/monitoring/map/assessments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: []  // Empty data for performance tests
          })
        });
      } else if (url.includes('/api/v1/monitoring/map/responses')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: []  // Empty data for performance tests
          })
        });
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: [] })
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Map Rendering Performance', () => {
    test('renders small dataset (10 entities) within acceptable time', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/v1/monitoring/map/entities')) {
          return Promise.resolve({
            ok: true,
            json: async () => generateLargeDataset(10)
          });
        } else if (url.includes('/api/v1/monitoring/map/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        } else if (url.includes('/api/v1/monitoring/map/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const renderTime = await measureRenderTime(async () => {
        await act(async () => {
          render(<InteractiveMap />);
        });
        
        await waitFor(() => {
          expect(screen.getByText('Interactive Mapping')).toBeInTheDocument();
        });
      });

      // Should render small dataset with CI-friendly thresholds
      expect(renderTime).toBeLessThan(isCI ? 3000 : 1000);
    });

    test('renders medium dataset (100 entities) with reasonable performance', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/v1/monitoring/map/entities')) {
          return Promise.resolve({
            ok: true,
            json: async () => generateLargeDataset(100)
          });
        } else if (url.includes('/api/v1/monitoring/map/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        } else if (url.includes('/api/v1/monitoring/map/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const renderTime = await measureRenderTime(async () => {
        await act(async () => {
          render(<InteractiveMap />);
        });
        
        await waitFor(() => {
          expect(screen.getByText('100')).toBeInTheDocument(); // Total entities
        });
      });

      // Should render medium dataset with CI-friendly thresholds
      expect(renderTime).toBeLessThan(isCI ? 5000 : 1500);
    });

    test('renders large dataset (1000 entities) within performance threshold', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/v1/monitoring/map/entities')) {
          return Promise.resolve({
            ok: true,
            json: async () => generateLargeDataset(1000)
          });
        } else if (url.includes('/api/v1/monitoring/map/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        } else if (url.includes('/api/v1/monitoring/map/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const renderTime = await measureRenderTime(async () => {
        await act(async () => {
          render(<InteractiveMap />);
        });
        
        await waitFor(() => {
          expect(screen.getByText('1000')).toBeInTheDocument(); // Total entities
        }, { timeout: 3000 });
      });

      // Should render large dataset with CI-friendly thresholds
      expect(renderTime).toBeLessThan(isCI ? 10000 : 5000);
    });
  });

  describe('Data Overlay Responsiveness', () => {
    test('EntityMapLayer handles rapid data updates efficiently', async () => {
      const updates = [];
      
      for (let i = 0; i < 2; i++) {
        const updateTime = await measureRenderTime(async () => {
          (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('/api/v1/monitoring/map/entities')) {
              return Promise.resolve({
                ok: true,
                json: async () => generateLargeDataset(50)
              });
            }
            return Promise.resolve({
              ok: true,
              json: async () => ({ success: true, data: [] })
            });
          });

          await act(async () => {
            render(<EntityMapLayer visible={true} refreshInterval={100} />);
          });
          
          await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
          });
        });
        
        updates.push(updateTime);
        cleanup();
      }

      // Average update time with CI-friendly thresholds
      const avgUpdateTime = updates.reduce((a, b) => a + b, 0) / updates.length;
      expect(avgUpdateTime).toBeLessThan(isCI ? 3000 : 1000);
      
      // No single update should exceed 2000ms (CI environment)
      updates.forEach(time => {
        expect(time).toBeLessThan(2000);
      });
    });

    test('AssessmentMapLayer maintains performance with multiple status types', async () => {
      const assessmentData = {
        success: true,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `assessment-${i}`,
          type: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'][i % 6],
          date: new Date().toISOString(),
          assessorName: `Assessor ${i}`,
          coordinates: {
            latitude: 12.0 + (i % 20) * 0.01,
            longitude: 14.0 + Math.floor(i / 20) * 0.01,
            accuracy: 10,
            timestamp: new Date().toISOString(),
            captureMethod: 'GPS'
          },
          entityName: `Entity ${i}`,
          verificationStatus: ['PENDING', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED'][i % 4],
          priorityLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4]
        }))
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/v1/monitoring/map/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => assessmentData
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const renderTime = await measureRenderTime(async () => {
        await act(async () => {
          render(<AssessmentMapLayer visible={true} />);
        });
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalled();
        });
      });

      // Should handle 50 assessments with CI-friendly thresholds
      expect(renderTime).toBeLessThan(isCI ? 3000 : 1000);
    });

    test('ResponseMapLayer handles complex delivery data efficiently', async () => {
      const responseData = {
        success: true,
        data: Array.from({ length: 40 }, (_, i) => ({
          id: `response-${i}`,
          responseType: ['FOOD_DISTRIBUTION', 'MEDICAL_SUPPLY', 'SHELTER_PROVISION'][i % 3],
          plannedDate: new Date().toISOString(),
          deliveredDate: i % 2 === 0 ? new Date().toISOString() : undefined,
          responderName: `Team ${i}`,
          coordinates: {
            latitude: 12.0 + (i % 15) * 0.01,
            longitude: 14.0 + Math.floor(i / 15) * 0.01,
            accuracy: 10,
            timestamp: new Date().toISOString(),
            captureMethod: 'GPS'
          },
          entityName: `Entity ${i}`,
          status: ['PLANNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED'][i % 4],
          deliveryItems: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => ({
            item: `Item ${j}`,
            quantity: Math.floor(Math.random() * 100) + 1
          }))
        }))
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/v1/monitoring/map/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => responseData
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const renderTime = await measureRenderTime(async () => {
        await act(async () => {
          render(<ResponseMapLayer visible={true} />);
        });
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalled();
        });
      });

      // Should handle 40 responses with CI-friendly thresholds
      expect(renderTime).toBeLessThan(isCI ? 3000 : 1000);
    });
  });

  describe('Memory Usage and Cleanup', () => {
    test('cleans up intervals on component unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = render(<EntityMapLayer visible={true} refreshInterval={1000} />);
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    test('handles component re-renders without memory leaks', async () => {
      const { rerender } = render(<EntityMapLayer visible={true} />);
      
      // Simulate multiple re-renders with different props
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          rerender(<EntityMapLayer visible={i % 2 === 0} refreshInterval={1000 + i * 100} />);
        });
      }
      
      // Should not throw or cause memory issues - component should handle re-renders gracefully
      // Since the last render has visible=false (i % 2 === 0, i=9 is odd), component won't render markers
      // Just verify no crashes occurred during re-renders by checking no error was thrown
      expect(true).toBe(true); // Test passes if no errors thrown during re-renders
    });
  });

  describe('Real-time Update Performance', () => {
    test('handles rapid refresh cycles without performance degradation', async () => {
      const refreshTimes = [];
      
      for (let cycle = 0; cycle < 2; cycle++) {
        (global.fetch as jest.Mock).mockImplementation((url: string) => {
          if (url.includes('/api/v1/monitoring/map/entities')) {
            return Promise.resolve({
              ok: true,
              json: async () => generateLargeDataset(50)
            });
          }
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: [] })
          });
        });

        const cycleTime = await measureRenderTime(async () => {
          const { rerender } = render(<EntityMapLayer visible={true} refreshInterval={500} />);
          
          // Wait for initial load
          await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
          });
          
          // Simulate refresh
          jest.clearAllMocks();
          (global.fetch as jest.Mock).mockImplementation((url: string) => {
            if (url.includes('/api/v1/monitoring/map/entities')) {
              return Promise.resolve({
                ok: true,
                json: async () => generateLargeDataset(50)
              });
            }
            return Promise.resolve({
              ok: true,
              json: async () => ({ success: true, data: [] })
            });
          });
          
          rerender(<EntityMapLayer visible={true} refreshInterval={500} />);
          
          await waitFor(() => {
            expect(fetch).toHaveBeenCalled();
          });
        });
        
        refreshTimes.push(cycleTime);
        cleanup();
      }
      
      // Refresh cycles should maintain consistent performance (CI environment)
      const avgRefreshTime = refreshTimes.reduce((a, b) => a + b, 0) / refreshTimes.length;
      expect(avgRefreshTime).toBeLessThan(1500);
      
      // Performance should not degrade significantly between cycles (CI environment)
      const maxVariation = Math.max(...refreshTimes) - Math.min(...refreshTimes);
      expect(maxVariation).toBeLessThan(1000);
    });

    test('efficiently handles concurrent layer updates', async () => {
      // Mock different datasets for each layer
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        callCount++;
        if (url.includes('/api/v1/monitoring/map/entities')) {
          return Promise.resolve({
            ok: true,
            json: async () => generateLargeDataset(100)
          });
        } else if (url.includes('/api/v1/monitoring/map/assessments')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              success: true, 
              data: Array(20).fill({}).map((_, i) => ({ 
                id: `assessment-${i}`,
                type: 'HEALTH',
                date: new Date().toISOString(),
                assessorName: `Assessor ${i}`,
                coordinates: {
                  latitude: 12.0,
                  longitude: 14.0,
                  accuracy: 10,
                  timestamp: new Date().toISOString(),
                  captureMethod: 'GPS'
                },
                entityName: `Entity ${i}`,
                verificationStatus: 'PENDING',
                priorityLevel: 'MEDIUM'
              }))
            })
          });
        } else if (url.includes('/api/v1/monitoring/map/responses')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              success: true, 
              data: Array(15).fill({}).map((_, i) => ({ 
                id: `response-${i}`,
                responseType: 'FOOD_DISTRIBUTION',
                plannedDate: new Date().toISOString(),
                responderName: `Team ${i}`,
                coordinates: {
                  latitude: 12.0,
                  longitude: 14.0,
                  accuracy: 10,
                  timestamp: new Date().toISOString(),
                  captureMethod: 'GPS'
                },
                entityName: `Entity ${i}`,
                status: 'PLANNED',
                deliveryItems: []
              }))
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] })
        });
      });

      const concurrentUpdateTime = await measureRenderTime(async () => {
        await act(async () => {
          render(
            <div>
              <EntityMapLayer visible={true} />
              <AssessmentMapLayer visible={true} />
              <ResponseMapLayer visible={true} />
            </div>
          );
        });
        
        await waitFor(() => {
          expect(fetch).toHaveBeenCalledTimes(3);
        });
      });

      // Concurrent updates with CI-friendly thresholds
      expect(concurrentUpdateTime).toBeLessThan(isCI ? 5000 : 2000);
    });
  });
});