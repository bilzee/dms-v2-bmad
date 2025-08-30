import { GET } from '@/app/api/v1/monitoring/situation/data-freshness/route';
import { NextRequest } from 'next/server';

describe('/api/v1/monitoring/situation/data-freshness', () => {
  it('returns data freshness indicators successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(4); // Should include all data categories
  });

  it('includes proper freshness indicator structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    const indicator = data.data[0];
    expect(indicator).toHaveProperty('category');
    expect(indicator).toHaveProperty('totalCount');
    expect(indicator).toHaveProperty('realTimeCount');
    expect(indicator).toHaveProperty('recentCount');
    expect(indicator).toHaveProperty('offlinePendingCount');
    expect(indicator).toHaveProperty('syncQueueSize');
  });

  it('validates data category enums', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    const validCategories = ['assessments', 'responses', 'incidents', 'entities'];
    
    data.data.forEach((indicator: any) => {
      expect(validCategories).toContain(indicator.category);
    });

    // Verify all categories are included
    const actualCategories = data.data.map((indicator: any) => indicator.category);
    validCategories.forEach(category => {
      expect(actualCategories).toContain(category);
    });
  });

  it('includes proper metadata summary', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('summary');
    expect(data.meta.summary).toHaveProperty('totalItems');
    expect(data.meta.summary).toHaveProperty('totalRealTime');
    expect(data.meta.summary).toHaveProperty('totalRecent');
    expect(data.meta.summary).toHaveProperty('totalOfflinePending');
    expect(data.meta.summary).toHaveProperty('totalQueueSize');
    expect(data.meta.summary).toHaveProperty('realTimePercentage');
    expect(data.meta.summary).toHaveProperty('recentPercentage');
    expect(data.meta.summary).toHaveProperty('offlinePendingPercentage');
  });

  it('calculates summary statistics correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    const summary = data.meta.summary;
    
    // Verify summary totals match sum of individual indicators
    const expectedTotalItems = data.data.reduce((sum: number, indicator: any) => sum + indicator.totalCount, 0);
    const expectedTotalRealTime = data.data.reduce((sum: number, indicator: any) => sum + indicator.realTimeCount, 0);
    const expectedTotalRecent = data.data.reduce((sum: number, indicator: any) => sum + indicator.recentCount, 0);
    const expectedTotalOfflinePending = data.data.reduce((sum: number, indicator: any) => sum + indicator.offlinePendingCount, 0);
    const expectedTotalQueueSize = data.data.reduce((sum: number, indicator: any) => sum + indicator.syncQueueSize, 0);

    expect(summary.totalItems).toBe(expectedTotalItems);
    expect(summary.totalRealTime).toBe(expectedTotalRealTime);
    expect(summary.totalRecent).toBe(expectedTotalRecent);
    expect(summary.totalOfflinePending).toBe(expectedTotalOfflinePending);
    expect(summary.totalQueueSize).toBe(expectedTotalQueueSize);
  });

  it('calculates percentages correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    const summary = data.meta.summary;
    
    if (summary.totalItems > 0) {
      const expectedRealTimePercentage = Math.round((summary.totalRealTime / summary.totalItems) * 100);
      const expectedRecentPercentage = Math.round((summary.totalRecent / summary.totalItems) * 100);
      const expectedOfflinePendingPercentage = Math.round((summary.totalOfflinePending / summary.totalItems) * 100);

      expect(summary.realTimePercentage).toBe(expectedRealTimePercentage);
      expect(summary.recentPercentage).toBe(expectedRecentPercentage);
      expect(summary.offlinePendingPercentage).toBe(expectedOfflinePendingPercentage);
    }
  });

  it('handles category filter parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness?category=assessments');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meta.filters.category).toBe('assessments');
    
    // All returned indicators should be for assessments when filtered
    data.data.forEach((indicator: any) => {
      expect(indicator.category).toBe('assessments');
    });
  });

  it('validates data consistency within indicators', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((indicator: any) => {
      // Total count should equal sum of real-time, recent, and offline pending
      const calculatedTotal = indicator.realTimeCount + indicator.recentCount + indicator.offlinePendingCount;
      expect(indicator.totalCount).toBe(calculatedTotal);
      
      // All counts should be non-negative
      expect(indicator.totalCount).toBeGreaterThanOrEqual(0);
      expect(indicator.realTimeCount).toBeGreaterThanOrEqual(0);
      expect(indicator.recentCount).toBeGreaterThanOrEqual(0);
      expect(indicator.offlinePendingCount).toBeGreaterThanOrEqual(0);
      expect(indicator.syncQueueSize).toBeGreaterThanOrEqual(0);
    });
  });

  it('includes thresholds in metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    expect(data.meta).toHaveProperty('thresholds');
    expect(data.meta.thresholds).toHaveProperty('realTimeMinutes');
    expect(data.meta.thresholds).toHaveProperty('recentHours');
    expect(data.meta.thresholds.realTimeMinutes).toBe(5);
    expect(data.meta.thresholds.recentHours).toBe(1);
  });

  it('returns valid date formats for oldest pending', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((indicator: any) => {
      if (indicator.oldestPending) {
        expect(new Date(indicator.oldestPending)).toBeInstanceOf(Date);
        expect(isNaN(new Date(indicator.oldestPending).getTime())).toBe(false);
      }
    });

    if (data.meta.summary.oldestPending) {
      expect(new Date(data.meta.summary.oldestPending)).toBeInstanceOf(Date);
      expect(isNaN(new Date(data.meta.summary.oldestPending).getTime())).toBe(false);
    }
  });

  it('handles includeDetails parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness?includeDetails=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.meta.includeDetails).toBe(true);
  });

  it('returns consistent data ranges', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/monitoring/situation/data-freshness');
    const response = await GET(request);
    const data = await response.json();

    data.data.forEach((indicator: any) => {
      // Verify data is within reasonable ranges
      expect(indicator.totalCount).toBeGreaterThanOrEqual(50);
      expect(indicator.totalCount).toBeLessThanOrEqual(250);
      expect(indicator.syncQueueSize).toBeGreaterThanOrEqual(0);
      expect(indicator.syncQueueSize).toBeLessThanOrEqual(22);
    });
  });
});