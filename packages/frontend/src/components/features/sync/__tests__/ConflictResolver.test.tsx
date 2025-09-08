/**
 * ConflictResolver Component Tests
 * 
 * Tests the main conflict resolution interface including:
 * - Conflict queue display and filtering
 * - Conflict selection and resolution
 * - Side-by-side comparison functionality
 * - Real-time updates and statistics
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ConflictResolver } from '../ConflictResolver';
import { syncEngine, type ConflictDetailed } from '@/lib/sync/SyncEngine';

// Mock data must be defined before mocks
const mockConflicts: ConflictDetailed[] = [
  {
    id: 'conflict-1',
    entityType: 'ASSESSMENT',
    entityId: 'entity-1', 
    conflictType: 'TIMESTAMP',
    severity: 'CRITICAL',
    localVersion: { name: 'Local Name', status: 'LOCAL_STATUS' },
    serverVersion: { name: 'Server Name', status: 'SERVER_STATUS' },
    conflictFields: ['status'],
    detectedAt: new Date(),
    detectedBy: 'user-1',
    status: 'PENDING',
    auditTrail: [
      {
        timestamp: new Date(),
        action: 'CONFLICT_DETECTED',
        performedBy: 'user-1',
        details: { conflictType: 'TIMESTAMP' }
      }
    ]
  },
  {
    id: 'conflict-2',
    entityType: 'RESPONSE',
    entityId: 'entity-2',
    conflictType: 'FIELD_LEVEL',
    severity: 'HIGH',
    localVersion: { notes: 'Local notes' },
    serverVersion: { notes: 'Server notes' },
    conflictFields: ['notes'],
    detectedAt: new Date(),
    detectedBy: 'user-2',
    status: 'PENDING',
    auditTrail: []
  }
];

const mockStats = {
  pendingConflicts: 2,
  criticalConflicts: 1,
  resolvedConflicts: 5,
  totalConflicts: 7
};

// Enhanced SyncEngine mock
jest.mock('@/lib/sync/SyncEngine', () => ({
  syncEngine: {
    getPendingConflicts: jest.fn(() => mockConflicts),
    getConflictStats: jest.fn(() => mockStats),
    resolveConflict: jest.fn(() => Promise.resolve()),
  }
}));

// Mock toast hook - CORRECTED PATH
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
  useToast: () => ({ toast: jest.fn() })
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/coordinator/conflicts',
}));

const mockSyncEngine = syncEngine as jest.Mocked<typeof syncEngine>;

describe('ConflictResolver', () => {

  beforeEach(() => {
    mockSyncEngine.getPendingConflicts.mockReturnValue(mockConflicts);
    mockSyncEngine.getConflictStats.mockReturnValue(mockStats);
    mockSyncEngine.resolveConflict.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render conflict resolution center with statistics', () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    expect(screen.getByText('Conflict Resolution Center')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Pending conflicts  
    expect(screen.getByText('1')).toBeInTheDocument(); // Critical conflicts
    expect(screen.getByText('5')).toBeInTheDocument(); // Resolved conflicts
    expect(screen.getByText('7')).toBeInTheDocument(); // Total conflicts
  });

  test('should display conflict queue with proper information', () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    expect(screen.getByText('Pending Conflicts (2)')).toBeInTheDocument();
    expect(screen.getByText('ASSESSMENT entity-1')).toBeInTheDocument();
    expect(screen.getByText('RESPONSE entity-2')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  test('should filter conflicts by severity', async () => {
    const user = userEvent.setup();
    
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Conflict Resolution Center')).toBeInTheDocument();
    });
    
    // Find severity select by role and label
    const severitySelect = screen.getByRole('combobox', { name: /severity/i });
    
    // Open select dropdown using user event
    await user.click(severitySelect);
    
    // Wait for dropdown options to appear
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Critical' })).toBeInTheDocument();
    });
    
    // Select Critical option
    await user.click(screen.getByRole('option', { name: 'Critical' }));
    
    // Verify filter was applied
    await waitFor(() => {
      // Should only show critical conflicts
      const criticalConflicts = screen.getAllByText(/CRITICAL/);
      expect(criticalConflicts).toHaveLength(1); // Based on mock data
    });
  });

  test('should filter conflicts by entity type', async () => {
    const user = userEvent.setup();
    
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Find entity type select by test ID or accessible name
    const entityTypeSelect = screen.getByRole('combobox', { name: /entity type/i });
    
    // Interact with select using user-event library for realistic simulation
    await user.click(entityTypeSelect);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Assessment' })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('option', { name: 'Assessment' }));
    
    // Verify filtering worked
    await waitFor(() => {
      const assessmentBadges = screen.getAllByText('ASSESSMENT');
      expect(assessmentBadges).toHaveLength(2); // Based on mock data
    });
  });

  test('should select conflict and show resolution panel', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    expect(screen.getByText('Resolving ASSESSMENT entity-1')).toBeInTheDocument();
    expect(screen.getByText('Data Comparison')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  test('should show resolution strategy options (MVP - basic only)', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    expect(screen.getByDisplayValue('Accept Server Version')).toBeInTheDocument();
    
    const strategySelect = screen.getByDisplayValue('Accept Server Version');
    await userEvent.click(strategySelect);
    
    expect(screen.getByText('Accept Local Changes')).toBeInTheDocument();
    // MVP: Advanced strategies removed
    expect(screen.queryByText('Merge Both Versions')).not.toBeInTheDocument();
    expect(screen.queryByText('Manual Resolution')).not.toBeInTheDocument();
  });

  test('should allow resolution without justification (MVP)', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    const resolveButton = screen.getByText('Resolve Conflict');
    expect(resolveButton).toBeEnabled(); // MVP: No longer requires justification
    
    const justificationInput = screen.getByPlaceholderText('Optional: Explain why this resolution was chosen...');
    expect(justificationInput).toBeInTheDocument();
  });

  test('should resolve conflict with proper parameters', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    // Enter justification (optional in MVP)
    const justificationInput = screen.getByPlaceholderText('Optional: Explain why this resolution was chosen...');
    await userEvent.type(justificationInput, 'Server version is more accurate');
    
    // Resolve conflict
    const resolveButton = screen.getByText('Resolve Conflict');
    await userEvent.click(resolveButton);
    
    await waitFor(() => {
      expect(mockSyncEngine.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        'SERVER_WINS',
        null,
        'coordinator-1',
        'Server version is more accurate'
      );
    });
  });

  test('should switch between resolution strategies', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    // Change resolution strategy
    const strategySelect = screen.getByDisplayValue('Accept Server Version');
    await userEvent.click(strategySelect);
    
    const localWinsOption = screen.getByText('Accept Local Changes');
    await userEvent.click(localWinsOption);
    
    expect(screen.getByDisplayValue('Accept Local Changes')).toBeInTheDocument();
  });

  test('should show critical conflict alert', () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    expect(screen.getByText('Critical conflicts detected!')).toBeInTheDocument();
    expect(screen.getByText('1 critical conflict(s) require immediate attention.')).toBeInTheDocument();
  });

  test('should display empty state when no conflicts', () => {
    mockSyncEngine.getPendingConflicts.mockReturnValue([]);
    
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    expect(screen.getByText('No pending conflicts!')).toBeInTheDocument();
    expect(screen.getByText('All conflicts have been resolved.')).toBeInTheDocument();
  });

  test('should call onConflictResolved callback', async () => {
    const mockCallback = jest.fn();
    render(<ConflictResolver coordinatorId="coordinator-1" onConflictResolved={mockCallback} />);
    
    // Select and resolve a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    const justificationInput = screen.getByPlaceholderText('Optional: Explain why this resolution was chosen...');
    await userEvent.type(justificationInput, 'Resolved');
    
    const resolveButton = screen.getByText('Resolve Conflict');
    await userEvent.click(resolveButton);
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalledWith('conflict-1');
    });
  });

  test('should handle resolution errors', async () => {
    mockSyncEngine.resolveConflict.mockRejectedValueOnce(new Error('Resolution failed'));
    
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select and try to resolve a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    const justificationInput = screen.getByPlaceholderText('Explain why this resolution was chosen...');
    await userEvent.type(justificationInput, 'Test resolution');
    
    const resolveButton = screen.getByText('Resolve Conflict');
    await userEvent.click(resolveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Resolve Conflict')).toBeInTheDocument(); // Button should be enabled again
    });
  });

  test('should refresh conflicts periodically', () => {
    jest.useFakeTimers();
    
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Fast-forward time by 30 seconds
    jest.advanceTimersByTime(30000);
    
    // Should have called getPendingConflicts again
    expect(mockSyncEngine.getPendingConflicts).toHaveBeenCalledTimes(2); // Initial + refresh
    
    jest.useRealTimers();
  });

  test('should clear selection when conflict is resolved', async () => {
    render(<ConflictResolver coordinatorId="coordinator-1" />);
    
    // Select a conflict
    const conflictCard = screen.getByText('ASSESSMENT entity-1').closest('div[role="button"]') as HTMLElement;
    await userEvent.click(conflictCard);
    
    expect(screen.getByText('Resolving ASSESSMENT entity-1')).toBeInTheDocument();
    
    // Resolve the conflict
    const justificationInput = screen.getByPlaceholderText('Optional: Explain why this resolution was chosen...');
    await userEvent.type(justificationInput, 'Resolved');
    
    const resolveButton = screen.getByText('Resolve Conflict');
    await userEvent.click(resolveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Select a conflict from the queue to begin resolution')).toBeInTheDocument();
    });
  });
});