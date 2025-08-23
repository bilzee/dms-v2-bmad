import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsePlanningForm } from '../ResponsePlanningForm';
import { ResponseType } from '@dms/shared';

// Mock console.error to catch React warnings
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ResponsePlanningForm Runtime Stability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not cause infinite re-renders when switching response types', async () => {
    render(<ResponsePlanningForm initialResponseType={ResponseType.HEALTH} />);

    const washTab = screen.getByRole('button', { name: /WASH/i });

    // Click the tab and verify no infinite loop errors
    fireEvent.click(washTab);

    await waitFor(() => {
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Maximum update depth exceeded/)
      );
    }, { timeout: 2000 });
  });

  it('should handle rapid tab switching without errors', async () => {
    render(<ResponsePlanningForm initialResponseType={ResponseType.HEALTH} />);

    const tabs = [
      screen.getByRole('button', { name: /WASH/i }),
      screen.getByRole('button', { name: /Shelter/i }),
      screen.getByRole('button', { name: /Food/i }),
      screen.getByRole('button', { name: /Health/i }),
    ];

    // Rapidly switch between tabs
    for (const tab of tabs) {
      fireEvent.click(tab);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await waitFor(() => {
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Warning.*update depth/)
      );
    });
  });
});