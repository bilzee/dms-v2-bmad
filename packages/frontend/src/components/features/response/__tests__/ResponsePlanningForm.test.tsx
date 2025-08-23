import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsePlanningForm } from '../ResponsePlanningForm';
import { useResponseStore } from '@/stores/response.store';
import { useGPS } from '@/hooks/useGPS';
import { ResponseType } from '@dms/shared';

// Mock dependencies
jest.mock('@/stores/response.store');
jest.mock('@/hooks/useGPS');

const mockResponseStore = useResponseStore as jest.MockedFunction<typeof useResponseStore>;
const mockUseGPS = useGPS as jest.MockedFunction<typeof useGPS>;

// Mock data
const mockEntity = {
  id: 'entity-1',
  type: 'CAMP' as const,
  name: 'Test Camp',
  lga: 'Test LGA',
  ward: 'Test Ward',
  latitude: 9.0765,
  longitude: 7.3986,
  campDetails: {
    campName: 'Test Camp',
    campStatus: 'OPEN' as const,
    campCoordinatorName: 'John Coordinator',
    campCoordinatorPhone: '+2348123456789',
    estimatedPopulation: 500,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAssessment = {
  id: 'assessment-1',
  type: 'HEALTH' as const,
  date: new Date(),
  affectedEntityId: 'entity-1',
  assessorName: 'Jane Assessor',
  assessorId: 'assessor-1',
  verificationStatus: 'VERIFIED' as const,
  syncStatus: 'SYNCED' as const,
  data: {
    hasFunctionalClinic: false,
    numberHealthFacilities: 0,
    healthFacilityType: 'None',
    qualifiedHealthWorkers: 1,
    hasMedicineSupply: false,
    hasMedicalSupplies: true,
    hasMaternalChildServices: false,
    commonHealthIssues: ['Malaria', 'Diarrhea'],
    additionalDetails: 'Urgent medical attention needed',
  },
  mediaAttachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStoreState = {
  currentDraft: null,
  drafts: [],
  responses: [],
  availableEntities: [mockEntity],
  availableAssessments: [mockAssessment],
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
  getCurrentLocation: jest.fn().mockResolvedValue({
    latitude: 9.0765,
    longitude: 7.3986,
  }),
  isCapturing: false,
};

describe('ResponsePlanningForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResponseStore.mockReturnValue(mockStoreState);
    mockUseGPS.mockReturnValue(mockGPSHooks);
  });

  it('renders response planning form with all sections', async () => {
    render(<ResponsePlanningForm />);

    expect(screen.getByText('Response Planning')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('WASH')).toBeInTheDocument();
    expect(screen.getByText('Shelter')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Population')).toBeInTheDocument();
  });

  it('creates draft when component initializes with entity ID', async () => {
    render(
      <ResponsePlanningForm 
        initialResponseType={ResponseType.HEALTH}
        initialEntityId="entity-1" 
      />
    );

    await waitFor(() => {
      expect(mockStoreState.createDraft).toHaveBeenCalledWith(ResponseType.HEALTH, 'entity-1');
    });
  });

  it('switches response type correctly', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    const washTab = screen.getByText('WASH');
    await user.click(washTab);

    expect(mockStoreState.updateDraft).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        responseType: ResponseType.WASH,
      })
    );
  });

  it('shows auto-save indicator when form is dirty', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    // Simulate form change to trigger auto-save
    const notesTextarea = screen.getByPlaceholderText(/additional notes/i);
    await user.type(notesTextarea, 'Test notes');

    // Auto-save should trigger after 10 seconds (mocked in test)
    await waitFor(() => {
      expect(screen.queryByText(/auto-saving/i)).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('handles form submission correctly', async () => {
    const onSave = jest.fn();
    const user = userEvent.setup();

    // Mock current draft
    const mockDraft = {
      id: 'draft-1',
      responseType: ResponseType.HEALTH,
      affectedEntityId: 'entity-1',
      plannedDate: new Date(),
      data: {},
      otherItemsDelivered: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockResponseStore.mockReturnValue({
      ...mockStoreState,
      currentDraft: mockDraft,
    });

    render(<ResponsePlanningForm onSave={onSave} />);

    const submitButton = screen.getByText('Submit Response Plan');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockStoreState.saveDraftToQueue).toHaveBeenCalledWith('draft-1');
    });
  });

  it('displays error message when error occurs', () => {
    mockResponseStore.mockReturnValue({
      ...mockStoreState,
      error: 'Test error message',
    });

    render(<ResponsePlanningForm />);

    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('loads planning data on mount', async () => {
    render(<ResponsePlanningForm />);

    await waitFor(() => {
      expect(mockStoreState.loadPlanningData).toHaveBeenCalled();
    });
  });

  it('handles GPS location capture for travel time estimation', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    // Simulate entity selection which should trigger GPS capture
    mockStoreState.availableEntities = [mockEntity];

    await waitFor(() => {
      expect(mockGPSHooks.getCurrentLocation).toHaveBeenCalled();
    });
  });

  it('renders response type specific fields correctly', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm initialResponseType={ResponseType.HEALTH} />);

    expect(screen.getByLabelText(/health workers deployed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/patients treated/i)).toBeInTheDocument();

    // Switch to WASH and check WASH-specific fields
    const washTab = screen.getByText('WASH');
    await user.click(washTab);

    await waitFor(() => {
      expect(screen.getByLabelText(/water delivered/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/water containers distributed/i)).toBeInTheDocument();
    });
  });

  it('validates form fields correctly', async () => {
    const user = userEvent.setup();
    render(<ResponsePlanningForm />);

    const submitButton = screen.getByText('Submit Response Plan');
    await user.click(submitButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('supports offline operation', () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<ResponsePlanningForm />);

    // Form should still be functional offline
    expect(screen.getByText('Response Planning')).toBeInTheDocument();
    expect(screen.getByText('Submit Response Plan')).toBeInTheDocument();
  });

  it('handles component cleanup correctly', () => {
    const { unmount } = render(<ResponsePlanningForm />);

    // Should not throw errors on unmount
    expect(() => unmount()).not.toThrow();
  });

  it('renders item quantity planner integration', () => {
    render(<ResponsePlanningForm />);

    expect(screen.getByText(/item.*quantity planning/i)).toBeInTheDocument();
    expect(screen.getByText(/show templates/i)).toBeInTheDocument();
  });

  it('renders delivery timeline planner integration', () => {
    render(<ResponsePlanningForm />);

    expect(screen.getByText(/delivery timeline planning/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/planned delivery date/i)).toBeInTheDocument();
  });

  it('renders entity assessment linker integration', () => {
    render(<ResponsePlanningForm />);

    expect(screen.getByText(/link to affected entity.*assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/affected entity/i)).toBeInTheDocument();
  });

  describe('Infinite Loop Prevention', () => {
    it('should not trigger infinite re-renders when switching response types', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<ResponsePlanningForm />);
      
      // Test rapid response type changes
      const washTab = screen.getByRole('button', { name: /wash/i });
      const healthTab = screen.getByRole('button', { name: /health/i });
      
      fireEvent.click(washTab);
      await waitFor(() => expect(washTab).toHaveAttribute('aria-pressed', 'true'));
      
      fireEvent.click(healthTab);
      await waitFor(() => expect(healthTab).toHaveAttribute('aria-pressed', 'true'));
      
      fireEvent.click(washTab);
      await waitFor(() => expect(washTab).toHaveAttribute('aria-pressed', 'true'));
      
      // Verify no infinite loop errors
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Maximum update depth')
      );
      
      consoleSpy.mockRestore();
    });
  });
});