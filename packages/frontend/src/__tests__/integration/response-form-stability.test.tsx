import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsePlanningForm } from '@/components/features/response/ResponsePlanningForm';
import { useResponseStore } from '@/stores/response.store';
import { useGPS } from '@/hooks/useGPS';

// Mock dependencies
jest.mock('@/stores/response.store');
jest.mock('@/hooks/useGPS');

const mockResponseStore = useResponseStore as jest.MockedFunction<typeof useResponseStore>;
const mockUseGPS = useGPS as jest.MockedFunction<typeof useGPS>;

const mockStoreState = {
  currentDraft: null,
  drafts: [],
  responses: [],
  availableEntities: [],
  availableAssessments: [],
  itemTemplates: [],
  isLoading: false,
  isCreating: false,
  error: null,
  filters: {},
  createDraft: jest.fn().mockReturnValue('draft-1'),
  updateDraft: jest.fn(),
  saveDraftToQueue: jest.fn().mockResolvedValue(undefined),
  deleteDraft: jest.fn(),
  loadResponses: jest.fn(),
  loadPlanningData: jest.fn(),
  setCurrentDraft: jest.fn(),
  clearError: jest.fn(),
  updateFilters: jest.fn(),
  addItemTemplate: jest.fn(),
  updateItemTemplate: jest.fn(),
  deleteItemTemplate: jest.fn(),
  getTemplatesForResponseType: jest.fn().mockReturnValue([]),
};

const mockGPSHooks = {
  coordinates: null,
  captureLocation: jest.fn().mockResolvedValue({
    latitude: 9.0765,
    longitude: 7.3986,
  }),
  isLoading: false,
  error: null,
  accuracy: null,
  clearCoordinates: jest.fn(),
  isSupported: true,
};

describe('ResponsePlanningForm Stability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResponseStore.mockReturnValue(mockStoreState);
    mockUseGPS.mockReturnValue(mockGPSHooks);
    
    // Spy on console.error to catch React warnings
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Maximum update depth exceeded')
    );
    jest.restoreAllMocks();
  });

  test('clicking response type tabs should not trigger infinite loops', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    // Test all response types
    const responseTypes = ['WASH', 'Health', 'Shelter', 'Food', 'Security', 'Population'];

    for (const type of responseTypes) {
      const tabButton = screen.getByText(type);
      await user.click(tabButton);
      
      await waitFor(() => {
        // Ensure component is stable after state update
        expect(tabButton).toBeInTheDocument();
        // Verify no infinite loop errors occurred
        expect(console.error).not.toHaveBeenCalledWith(
          expect.stringContaining('Maximum update depth exceeded')
        );
      }, { timeout: 1000 });
    }
    
    // Verify updateDraft was called for each tab switch
    expect(mockStoreState.updateDraft).toHaveBeenCalledTimes(responseTypes.length);
  });

  test('rapid tab switching should remain stable', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    const responseTypes = ['WASH', 'Health', 'Shelter', 'Food'];
    
    // Rapidly switch between tabs multiple times
    for (let i = 0; i < 3; i++) {
      for (const type of responseTypes) {
        const tabButton = screen.getByText(type);
        await user.click(tabButton);
      }
    }

    await waitFor(() => {
      // Should not have any infinite loop errors
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth exceeded')
      );
    }, { timeout: 2000 });
  });
});