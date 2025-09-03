import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerificationStamp } from '@/components/features/verification/VerificationStamp';

// Mock fetch
global.fetch = jest.fn();

const mockProps = {
  responseId: 'response-123',
  verificationId: 'verification-456',
  verifiedAt: new Date('2025-09-01T10:00:00Z'),
  verifiedBy: 'John Coordinator',
  verificationNotes: 'All requirements met, excellent delivery',
  donorName: 'Jane Donor',
  donorId: 'donor-789',
  achievements: [
    { id: 'ach-1', title: 'First Verified Delivery', icon: '✅' },
    { id: 'ach-2', title: 'Quality Streak', icon: '🔥' }
  ]
};

describe('VerificationStamp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders verification stamp with full details', () => {
    render(<VerificationStamp {...mockProps} />);

    expect(screen.getByText('Response Verified')).toBeInTheDocument();
    expect(screen.getByText('Verified by: John Coordinator')).toBeInTheDocument();
    expect(screen.getByText('Donor: Jane Donor')).toBeInTheDocument();
    expect(screen.getByText('All requirements met, excellent delivery')).toBeInTheDocument();
  });

  it('renders compact version correctly', () => {
    render(<VerificationStamp {...mockProps} size="compact" />);

    expect(screen.getByText('Verified by John Coordinator')).toBeInTheDocument();
    expect(screen.getByText('+2 🏆')).toBeInTheDocument();
    expect(screen.queryByText('Response Verified')).not.toBeInTheDocument();
  });

  it('displays achievements earned', () => {
    render(<VerificationStamp {...mockProps} />);

    expect(screen.getByText('Achievements Earned')).toBeInTheDocument();
    expect(screen.getByText('✅ First Verified Delivery')).toBeInTheDocument();
    expect(screen.getByText('🔥 Quality Streak')).toBeInTheDocument();
  });

  it('handles certificate generation', async () => {
    const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob)
    });

    // Mock URL methods
    const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock DOM methods
    const mockClick = jest.fn();
    const mockElement = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    jest.spyOn(document.body, 'appendChild').mockImplementation();
    jest.spyOn(document.body, 'removeChild').mockImplementation();

    render(<VerificationStamp {...mockProps} />);

    const certificateButton = screen.getByText('Generate Certificate');
    fireEvent.click(certificateButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/v1/verification/responses/${mockProps.responseId}/certificate`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            donorId: mockProps.donorId,
            verificationId: mockProps.verificationId,
            includeAchievements: true
          })
        })
      );
    });

    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles missing optional props gracefully', () => {
    const minimalProps = {
      responseId: 'response-123',
      verificationId: 'verification-456',
      verifiedAt: new Date('2025-09-01T10:00:00Z'),
      verifiedBy: 'John Coordinator'
    };

    render(<VerificationStamp {...minimalProps} />);

    expect(screen.getByText('Response Verified')).toBeInTheDocument();
    expect(screen.queryByText('Verification Notes:')).not.toBeInTheDocument();
    expect(screen.queryByText('Achievements Earned')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate Certificate')).not.toBeInTheDocument();
  });

  it('does not show certificate button when no donorId provided', () => {
    const propsWithoutDonor = { ...mockProps, donorId: undefined };
    render(<VerificationStamp {...propsWithoutDonor} />);

    expect(screen.queryByText('Generate Certificate')).not.toBeInTheDocument();
  });

  it('shows verification ID truncated correctly', () => {
    render(<VerificationStamp {...mockProps} />);

    expect(screen.getByText('ID: verifica...')).toBeInTheDocument();
  });
});