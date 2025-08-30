import { NextRequest } from 'next/server';

// Import the API handlers
import { GET as getMetrics } from '@/app/api/v1/system/performance/metrics/route';
import { GET as getUsers } from '@/app/api/v1/system/performance/users/route';
import { GET as getSyncStats } from '@/app/api/v1/system/performance/sync-stats/route';
import { GET as getActiveAlerts, POST as acknowledgeAlert } from '@/app/api/v1/system/alerts/active/route';
import { GET as getAlertConfigs, POST as createAlert } from '@/app/api/v1/system/alerts/configure/route';

describe('System Performance API Endpoints', () => {
  describe('GET /api/v1/system/performance/metrics', () => {
    it('returns system performance metrics successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/metrics');
      const response = await getMetrics(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('metrics');
      expect(data.data.metrics).toHaveProperty('cpuUsage');
      expect(data.data.metrics).toHaveProperty('memoryUsage');
      expect(data.data.metrics).toHaveProperty('apiResponseTime');
      expect(data.data.metrics).toHaveProperty('databaseLatency');
      expect(data.data.metrics).toHaveProperty('errorRate');
      expect(data.data).toHaveProperty('systemHealth');
    });

    it('includes trends when includeHistory=true', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/metrics?includeHistory=true');
      const response = await getMetrics(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('trends');
    });

    it('does not include trends when includeHistory=false', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/metrics?includeHistory=false');
      const response = await getMetrics(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.trends).toBeUndefined();
    });

    it('includes system health indicators', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/metrics');
      const response = await getMetrics(req);
      const data = await response.json();

      expect(data.data.systemHealth).toHaveProperty('overall');
      expect(data.data.systemHealth).toHaveProperty('components');
      expect(data.data.systemHealth.components).toHaveProperty('cpu');
      expect(data.data.systemHealth.components).toHaveProperty('memory');
      expect(data.data.systemHealth.components).toHaveProperty('database');
      expect(data.data.systemHealth.components).toHaveProperty('api');
    });
  });

  describe('GET /api/v1/system/performance/users', () => {
    it('returns user activity data successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/users');
      const response = await getUsers(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('users');
      expect(data.data).toHaveProperty('stats');
      expect(Array.isArray(data.data.users)).toBe(true);
    });

    it('filters by role when role parameter is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/users?role=ASSESSOR');
      const response = await getUsers(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // All returned users should have the ASSESSOR role
      data.data.users.forEach((user: any) => {
        expect(user.role).toBe('ASSESSOR');
      });
    });

    it('includes inactive users when includeInactive=true', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/users?includeInactive=true');
      const response = await getUsers(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes user statistics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/users');
      const response = await getUsers(req);
      const data = await response.json();

      expect(data.data.stats).toHaveProperty('totalActiveUsers');
      expect(data.data.stats).toHaveProperty('totalSessions');
      expect(data.data.stats).toHaveProperty('roleBreakdown');
      expect(data.data.stats).toHaveProperty('topPages');
    });
  });

  describe('GET /api/v1/system/performance/sync-stats', () => {
    it('returns sync statistics successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/sync-stats');
      const response = await getSyncStats(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('syncStatistics');
      expect(data.data.syncStatistics).toHaveProperty('totalSyncRequests');
      expect(data.data.syncStatistics).toHaveProperty('successfulSyncs');
      expect(data.data.syncStatistics).toHaveProperty('failedSyncs');
      expect(data.data.syncStatistics).toHaveProperty('conflictCount');
    });

    it('includes queue metrics when includeQueue=true', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/sync-stats?includeQueue=true');
      const response = await getSyncStats(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('queueMetrics');
    });

    it('includes health indicators', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/sync-stats');
      const response = await getSyncStats(req);
      const data = await response.json();

      expect(data.data).toHaveProperty('healthIndicators');
      expect(data.data.healthIndicators).toHaveProperty('overall');
    });

    it('includes performance metrics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/performance/sync-stats');
      const response = await getSyncStats(req);
      const data = await response.json();

      expect(data.data).toHaveProperty('performance');
      expect(data.data.performance).toHaveProperty('successRate');
      expect(data.data.performance).toHaveProperty('failureRate');
      expect(data.data.performance).toHaveProperty('conflictRate');
    });
  });

  describe('GET /api/v1/system/alerts/active', () => {
    it('returns active alerts successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active');
      const response = await getActiveAlerts(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('summary');
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('filters by severity when severity parameter is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active?severity=CRITICAL');
      const response = await getActiveAlerts(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('filters by alert type when type parameter is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active?type=PERFORMANCE');
      const response = await getActiveAlerts(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes system status in response', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active');
      const response = await getActiveAlerts(req);
      const data = await response.json();

      expect(data.data).toHaveProperty('systemStatus');
      expect(data.data.systemStatus).toHaveProperty('overall');
      expect(data.data.systemStatus).toHaveProperty('lastChecked');
    });
  });

  describe('POST /api/v1/system/alerts/active', () => {
    it('acknowledges alert successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active', {
        method: 'POST',
        body: JSON.stringify({ alertId: 'alert-123' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await acknowledgeAlert(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alertId');
      expect(data.data.alertId).toBe('alert-123');
    });

    it('returns error when alertId is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/active', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await acknowledgeAlert(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing alert ID');
    });
  });

  describe('GET /api/v1/system/alerts/configure', () => {
    it('returns alert configurations successfully', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure');
      const response = await getAlertConfigs(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('summary');
      expect(Array.isArray(data.data.alerts)).toBe(true);
    });

    it('filters by enabled status', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure?enabled=true');
      const response = await getAlertConfigs(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('includes summary statistics', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure');
      const response = await getAlertConfigs(req);
      const data = await response.json();

      expect(data.data.summary).toHaveProperty('byType');
      expect(data.data.summary).toHaveProperty('bySeverity');
    });
  });

  describe('POST /api/v1/system/alerts/configure', () => {
    it('creates alert configuration successfully', async () => {
      const alertConfig = {
        type: 'PERFORMANCE',
        severity: 'HIGH',
        threshold: 85,
        title: 'High CPU Usage Alert',
        description: 'Alert when CPU usage exceeds 85%',
        enabled: true,
        notificationChannels: ['EMAIL']
      };

      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure', {
        method: 'POST',
        body: JSON.stringify(alertConfig),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await createAlert(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('alert');
      expect(data.data.alert.type).toBe('PERFORMANCE');
      expect(data.data.alert.severity).toBe('HIGH');
    });

    it('returns error for missing required fields', async () => {
      const invalidConfig = {
        type: 'PERFORMANCE',
        // Missing severity, threshold, title
      };

      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure', {
        method: 'POST',
        body: JSON.stringify(invalidConfig),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await createAlert(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing required fields');
    });

    it('validates alert type', async () => {
      const invalidConfig = {
        type: 'INVALID_TYPE',
        severity: 'HIGH',
        threshold: 85,
        title: 'Test Alert',
      };

      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure', {
        method: 'POST',
        body: JSON.stringify(invalidConfig),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await createAlert(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid alert type');
    });

    it('validates severity level', async () => {
      const invalidConfig = {
        type: 'PERFORMANCE',
        severity: 'INVALID_SEVERITY',
        threshold: 85,
        title: 'Test Alert',
      };

      const req = new NextRequest('http://localhost:3000/api/v1/system/alerts/configure', {
        method: 'POST',
        body: JSON.stringify(invalidConfig),
        headers: { 'Content-Type': 'application/json' },
      });
      const response = await createAlert(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid severity level');
    });
  });
});