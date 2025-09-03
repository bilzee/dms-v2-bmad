import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AchievementLeaderboard } from '@/components/features/donor/AchievementLeaderboard';

// Mock fetch
global.fetch = jest.fn();

const mockLeaderboardData = {
  leaderboard: [
    {
      donorId: 'donor-1',
      donorName: 'John Smith',
      donorOrganization: 'Relief Corp',
      achievements: 15,
      verifiedDeliveries: 25,
      verificationRate: 95,
      totalBeneficiaries: 150,
      score: 87,
      recentAchievements: [
        { title: 'Quality Streak', icon: '🔥', earnedAt: new Date('2025-09-01') }
      ],
      isCurrentUser: false
    },
    {
      donorId: 'donor-2',
      donorName: 'Jane Doe',
      donorOrganization: 'Global Aid',
      achievements: 12,
      verifiedDeliveries: 20,
      verificationRate: 90,
      totalBeneficiaries: 120,
      score: 78,
      recentAchievements: [],
      isCurrentUser: true
    }
  ],
  currentUserRank: 2,
  metadata: {
    category: 'OVERALL',
    timeframe: '90',
    totalParticipants: 2,
    generatedAt: '2025-09-03T10:00:00Z'
  }
};

describe('AchievementLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        data: mockLeaderboardData
      })
    });
  });

  it('renders leaderboard with donor entries', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Achievement Leaderboard')).toBeInTheDocument();
    });

    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Relief Corp')).toBeInTheDocument();
    expect(screen.getByText('Global Aid')).toBeInTheDocument();
  });

  it('highlights current user entry', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    const currentUserEntry = screen.getByText('Jane Doe').closest('.border-blue-300');
    expect(currentUserEntry).toBeInTheDocument();
  });

  it('displays rank icons correctly', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      // First place should have crown icon
      expect(screen.getByText('John Smith').closest('div')).toBeInTheDocument();
      // Second place should show #2
      expect(screen.getByText('#2')).toBeInTheDocument();
    });
  });

  it('shows achievement metrics for each donor', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('87')).toBeInTheDocument(); // John's score
      expect(screen.getByText('78')).toBeInTheDocument(); // Jane's score
      expect(screen.getByText('15')).toBeInTheDocument(); // John's achievements
      expect(screen.getByText('25')).toBeInTheDocument(); // John's verified deliveries
      expect(screen.getByText('95%')).toBeInTheDocument(); // John's verification rate
    });
  });

  it('displays recent achievements', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByTitle('Quality Streak - 9/1/2025')).toBeInTheDocument();
    });
  });

  it('filters by category', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Achievement Leaderboard')).toBeInTheDocument();
    });

    const verificationButton = screen.getByText('Verification');
    fireEvent.click(verificationButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=VERIFICATION')
      );
    });
  });

  it('filters by timeframe', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Achievement Leaderboard')).toBeInTheDocument();
    });

    const yearButton = screen.getByText('This Year');
    fireEvent.click(yearButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('timeframe=year')
      );
    });
  });

  it('toggles privacy settings', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Achievement Leaderboard')).toBeInTheDocument();
    });

    const privacyToggle = screen.getByRole('switch');
    fireEvent.click(privacyToggle);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('includePrivate=true')
      );
    });
  });

  it('shows empty state when no participants', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: {
          ...mockLeaderboardData,
          leaderboard: []
        }
      })
    });

    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('No participants found for the selected criteria')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AchievementLeaderboard />);

    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        message: 'Server error'
      })
    });

    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
  });

  it('shows current user rank when outside top 20', async () => {
    const dataWithLowRank = {
      ...mockLeaderboardData,
      currentUserRank: 25
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: dataWithLowRank
      })
    });

    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('#25')).toBeInTheDocument();
      expect(screen.getByText('Your Rank')).toBeInTheDocument();
      expect(screen.getByText('5 positions to reach top 20')).toBeInTheDocument();
    });
  });

  it('displays impact metrics when IMPACT category selected', async () => {
    render(<AchievementLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Achievement Leaderboard')).toBeInTheDocument();
    });

    const impactButton = screen.getByText('Impact');
    fireEvent.click(impactButton);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // John's beneficiaries
      expect(screen.getByText('120')).toBeInTheDocument(); // Jane's beneficiaries
    });
  });
});