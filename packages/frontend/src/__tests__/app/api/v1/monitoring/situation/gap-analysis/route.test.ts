import { GET } from '@/app/api/v1/monitoring/situation/gap-analysis/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/situation/gap-analysis', () => {
  it('returns gap analysis data successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(5); // Should include all assessment types
  });

  it('includes proper gap analysis structure for each type', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    const gapAnalysis = data.data[0];
    expect(gapAnalysis).toHaveProperty('assessmentType');
    expect(gapAnalysis).toHaveProperty('totalNeeds');
    expect(gapAnalysis).toHaveProperty('totalResponses');
    expect(gapAnalysis).toHaveProperty('fulfillmentRate');
    expect(gapAnalysis).toHaveProperty('criticalGaps');
    expect(gapAnalysis).toHaveProperty('affectedEntities');
    expect(gapAnalysis).toHaveProperty('lastAssessment');
    expect(gapAnalysis).toHaveProperty('priority');
  });

  it('validates assessment type enums', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    const validAssessmentTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    data.data.forEach((gap: any) => {
      expect(validAssessmentTypes).toContain(gap.assessmentType);
      expect(validPriorities).toContain(gap.priority);
    });
  });

  it('calculates fulfillment rates correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((gap: any) => {
      expect(gap.fulfillmentRate).toBeGreaterThanOrEqual(0);
      expect(gap.fulfillmentRate).toBeLessThanOrEqual(100);
      
      // Fulfillment rate should be calculated correctly
      if (gap.totalNeeds > 0) {
        const expectedRate = Math.floor((gap.totalResponses / gap.totalNeeds) * 100);
        expect(gap.fulfillmentRate).toBe(expectedRate);
      }
    });
  });

  it('assigns priority based on fulfillment rate and critical gaps', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((gap: any) => {
      if (gap.fulfillmentRate < 30 || gap.criticalGaps > 30) {
        expect(gap.priority).toBe('CRITICAL');
      } else if (gap.fulfillmentRate < 60 || gap.criticalGaps > 15) {
        expect(gap.priority).toBe('HIGH');
      } else if (gap.fulfillmentRate < 80 || gap.criticalGaps > 5) {
        expect(gap.priority).toBe('MEDIUM');
      } else {
        expect(gap.priority).toBe('LOW');
      }
    });
  });

  it('includes proper metadata calculations', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('overallFulfillmentRate');
    expect(data.meta).toHaveProperty('criticalGapsCount');
    expect(data.meta).toHaveProperty('totalCriticalGaps');
    expect(data.meta).toHaveProperty('lastAnalysisUpdate');

    // Verify metadata calculations
    const actualCriticalCount = data.data.filter((gap: any) => gap.priority === 'CRITICAL').length;
    expect(data.meta.criticalGapsCount).toBe(actualCriticalCount);

    expect(data.meta.overallFulfillmentRate).toBeGreaterThanOrEqual(0);
    expect(data.meta.overallFulfillmentRate).toBeLessThanOrEqual(100);
  });

  it('handles assessment type filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis?assessmentType=HEALTH');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.assessmentType).toBe('HEALTH');
    
    // All returned gaps should be for HEALTH when filtered
    data.data.forEach((gap: any) => {
      expect(gap.assessmentType).toBe('HEALTH');
    });
  });

  it('handles priority filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis?priority=CRITICAL');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.priority).toBe('CRITICAL');
  });

  it('handles threshold filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis?threshold=50');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.threshold).toBe('50');
    
    // All returned gaps should have fulfillment rate <= 50%
    data.data.forEach((gap: any) => {
      expect(gap.fulfillmentRate).toBeLessThanOrEqual(50);
    });
  });

  it('sorts data correctly by priority then fulfillment rate', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    // Verify sorting: CRITICAL priority first, then lowest fulfillment rates first
    const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    
    for (let i = 0; i < data.data.length - 1; i++) {
      const current = data.data[i];
      const next = data.data[i + 1];
      
      const currentPriorityValue = priorityOrder[current.priority as keyof typeof priorityOrder];
      const nextPriorityValue = priorityOrder[next.priority as keyof typeof priorityOrder];
      
      if (currentPriorityValue === nextPriorityValue) {
        // Same priority, should be sorted by fulfillment rate (lower first)
        expect(current.fulfillmentRate).toBeLessThanOrEqual(next.fulfillmentRate);
      } else {
        // Different priority, current should have higher priority value
        expect(currentPriorityValue).toBeGreaterThanOrEqual(nextPriorityValue);
      }
    }
  });

  it('returns valid date formats', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((gap: any) => {
      expect(new Date(gap.lastAssessment)).toBeInstanceOf(Date);
      expect(isNaN(new Date(gap.lastAssessment).getTime())).toBe(false);
      
      if (gap.lastResponse) {
        expect(new Date(gap.lastResponse)).toBeInstanceOf(Date);
        expect(isNaN(new Date(gap.lastResponse).getTime())).toBe(false);
      }
    });
  });

  it('includes all required assessment types', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    const expectedTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY'];
    const actualTypes = data.data.map((gap: any) => gap.assessmentType);
    
    expectedTypes.forEach(type => {
      expect(actualTypes).toContain(type);
    });
  });

  it('returns consistent gap calculations', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/gap-analysis');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((gap: any) => {
      // Critical gaps should be calculated as totalNeeds - totalResponses (but not negative)
      const expectedCriticalGaps = Math.max(0, gap.totalNeeds - gap.totalResponses);
      expect(gap.criticalGaps).toBe(expectedCriticalGaps);
    });
  });
});