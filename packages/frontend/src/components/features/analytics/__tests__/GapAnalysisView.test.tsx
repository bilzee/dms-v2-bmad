import React from 'react';
import { render, screen } from '@testing-library/react';
import { GapAnalysisView } from '../GapAnalysisView';

describe('GapAnalysisView', () => {
  it('displays no gap state correctly', () => {
    const gapAnalysis = {
      responseGap: false,
      unmetNeeds: 0,
      responseTimestamp: '2023-01-01T12:00:00Z',
      gapSeverity: 'LOW' as const,
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    expect(screen.getByText('No significant gaps identified')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.getByText(/Response activities appear to adequately address/)).toBeInTheDocument();
  });

  it('displays high severity gap correctly', () => {
    const gapAnalysis = {
      responseGap: true,
      unmetNeeds: 75.5,
      responseTimestamp: '2023-01-01T12:00:00Z',
      gapSeverity: 'HIGH' as const,
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    expect(screen.getByText('Critical response gaps identified')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument();
    expect(screen.getByText(/Gap analysis indicates that current response efforts/)).toBeInTheDocument();
    expect(screen.getByText(/Approximately 75.5% of needs remain unmet/)).toBeInTheDocument();
  });

  it('displays medium severity gap correctly', () => {
    const gapAnalysis = {
      responseGap: true,
      unmetNeeds: 45.0,
      responseTimestamp: '2023-01-01T14:30:00Z',
      gapSeverity: 'MEDIUM' as const,
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    expect(screen.getByText('Moderate response gaps identified')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  it('displays low severity gap correctly', () => {
    const gapAnalysis = {
      responseGap: true,
      unmetNeeds: 15.2,
      responseTimestamp: '2023-01-01T16:45:00Z',
      gapSeverity: 'LOW' as const,
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    expect(screen.getByText('Minor response gaps identified')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('15.2%')).toBeInTheDocument();
  });

  it('handles boolean-only gaps (no severity classification)', () => {
    const gapAnalysis = {
      responseGap: true,
      unmetNeeds: 0,
      responseTimestamp: '2023-01-01T18:00:00Z',
      gapSeverity: undefined as any, // No severity provided
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    expect(screen.getByText('Response gaps identified')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    const gapAnalysis = {
      responseGap: false,
      unmetNeeds: 0,
      responseTimestamp: '2023-06-15T14:30:45Z',
      gapSeverity: 'LOW' as const,
    };

    render(<GapAnalysisView gapAnalysis={gapAnalysis} />);

    // Check that the timestamp is formatted and displayed
    expect(screen.getByText(/Last Response:/)).toBeInTheDocument();
    // The exact format depends on locale, but should contain the date
    expect(screen.getByText(/6\/15\/2023|15\/6\/2023|2023/)).toBeInTheDocument();
  });

  it('displays correct icons for different gap states', () => {
    const { rerender } = render(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: false,
          unmetNeeds: 0,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'LOW',
        }} 
      />
    );

    // Check for CheckCircle icon (no gap)
    expect(document.querySelector('.lucide-check-circle')).toBeInTheDocument();

    // Test high severity gap (AlertTriangle)
    rerender(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: true,
          unmetNeeds: 80,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'HIGH',
        }} 
      />
    );

    expect(document.querySelector('.lucide-alert-triangle')).toBeInTheDocument();

    // Test medium severity gap (AlertCircle)
    rerender(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: true,
          unmetNeeds: 40,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'MEDIUM',
        }} 
      />
    );

    expect(document.querySelector('.lucide-alert-circle')).toBeInTheDocument();
  });

  it('shows unmet needs only when there is a response gap', () => {
    const { rerender } = render(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: false,
          unmetNeeds: 0,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'LOW',
        }} 
      />
    );

    // Should not show unmet needs section when no gap
    expect(screen.queryByText('Unmet Needs:')).not.toBeInTheDocument();

    // Test with gap
    rerender(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: true,
          unmetNeeds: 35.7,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'MEDIUM',
        }} 
      />
    );

    // Should show unmet needs section when there is a gap
    expect(screen.getByText('Unmet Needs:')).toBeInTheDocument();
    expect(screen.getByText('35.7%')).toBeInTheDocument();
  });

  it('applies correct color classes for different severity levels', () => {
    const { container, rerender } = render(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: false,
          unmetNeeds: 0,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'LOW',
        }} 
      />
    );

    // Check for green colors (no gap)
    expect(container.querySelector('.bg-green-50')).toBeInTheDocument();
    expect(container.querySelector('.text-green-600')).toBeInTheDocument();

    // Test high severity (red colors)
    rerender(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: true,
          unmetNeeds: 80,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'HIGH',
        }} 
      />
    );

    expect(container.querySelector('.bg-red-50')).toBeInTheDocument();
    expect(container.querySelector('.text-red-600')).toBeInTheDocument();

    // Test medium severity (yellow colors)
    rerender(
      <GapAnalysisView 
        gapAnalysis={{
          responseGap: true,
          unmetNeeds: 40,
          responseTimestamp: '2023-01-01T12:00:00Z',
          gapSeverity: 'MEDIUM',
        }} 
      />
    );

    expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument();
    expect(container.querySelector('.text-yellow-600')).toBeInTheDocument();
  });
});