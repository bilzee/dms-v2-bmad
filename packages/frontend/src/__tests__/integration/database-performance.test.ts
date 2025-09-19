import DatabaseService from '@/lib/services/DatabaseService';
import { PrismaClient } from '@prisma/client';

interface QueryPerformanceTest {
  name: string;
  query: () => Promise<any>;
  description: string;
  expectedMaxTime: number; // in milliseconds
}

interface PerformanceBenchmark {
  testName: string;
  duration: number;
  success: boolean;
  error?: string;
  queryCount?: number;
  memoryBefore?: number;
  memoryAfter?: number;
}

class DatabasePerformanceTester {
  private testResults: PerformanceBenchmark[] = [];

  async runPerformanceTests(): Promise<{
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      averageDuration: number;
      slowestTest?: string;
      fastestTest?: string;
    };
    results: PerformanceBenchmark[];
    recommendations: string[];
  }> {
    const tests: QueryPerformanceTest[] = [
      {
        name: 'Incident List Query',
        query: () => DatabaseService.getIncidents({ limit: 50 }),
        description: 'Fetch list of incidents with basic filtering',
        expectedMaxTime: 500,
      },
      {
        name: 'Incident Statistics Query',
        query: () => DatabaseService.getIncidentStats(),
        description: 'Calculate incident statistics with multiple aggregations',
        expectedMaxTime: 300,
      },
      {
        name: 'Affected Entities Query',
        query: () => DatabaseService.getAffectedEntities({ limit: 100 }),
        description: 'Fetch affected entities with relationship includes',
        expectedMaxTime: 400,
      },
      {
        name: 'Donor Performance Query',
        query: () => DatabaseService.getDonors(),
        description: 'Fetch donors with relationship includes and ordering',
        expectedMaxTime: 350,
      },
      {
        name: 'Complex Assessment Aggregation',
        query: () => DatabaseService.getAssessmentAggregations(),
        description: 'Complex assessment data aggregation',
        expectedMaxTime: 800,
      },
      {
        name: 'User List with Roles',
        query: () => DatabaseService.listUsers({ limit: 100 }),
        description: 'User listing with role relationships',
        expectedMaxTime: 250,
      },
      {
        name: 'Audit Trail Query',
        query: () => DatabaseService.getAuditLogs({ limit: 100 }),
        description: 'Audit log retrieval with filtering',
        expectedMaxTime: 200,
      },
    ];

    this.testResults = [];

    for (const test of tests) {
      console.log(`Running performance test: ${test.name}`);
      
      try {
        const memoryBefore = process.memoryUsage().heapUsed;
        const startTime = Date.now();
        
        // Run the query multiple times to get average
        const iterations = 5;
        for (let i = 0; i < iterations; i++) {
          await test.query();
        }
        
        const duration = (Date.now() - startTime) / iterations; // Average duration
        const memoryAfter = process.memoryUsage().heapUsed;
        
        const success = duration <= test.expectedMaxTime;
        
        this.testResults.push({
          testName: test.name,
          duration,
          success,
          memoryBefore,
          memoryAfter,
          queryCount: iterations,
        });

        if (!success) {
          console.warn(`⚠️  Performance test failed: ${test.name} took ${duration}ms (expected < ${test.expectedMaxTime}ms)`);
        } else {
          console.log(`✅ Performance test passed: ${test.name} took ${duration}ms`);
        }
      } catch (error) {
        console.error(`❌ Performance test error: ${test.name}`, error);
        this.testResults.push({
          testName: test.name,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          queryCount: 0,
        });
      }
    }

    return this.generateReport();
  }

  async runIndexAnalysis(): Promise<{
    tableIndexes: Record<string, any[]>;
    missingIndexes: string[];
    recommendations: string[];
  }> {
    const prisma = DatabaseService.prisma;
    const tableIndexes: Record<string, any[]> = {};
    const missingIndexes: string[] = [];

    try {
      // Get index information for key tables
      const tables = ['incidents', 'rapid_assessments', 'rapid_responses', 'affected_entities', 'donors'];
      
      for (const table of tables) {
        const indexes = await prisma.$queryRawUnsafe(`
          SELECT 
            indexname as name,
            indexdef as definition
          FROM pg_indexes 
          WHERE tablename = '${table}'
          ORDER BY indexname;
        `) as any[];
        
        tableIndexes[table] = indexes;
      }

      // Analyze common query patterns for missing indexes
      const commonQueries = [
        {
          pattern: 'status + severity filtering',
          tables: ['incidents'],
          where: "WHERE status = ? AND severity = ?",
          recommendation: 'Consider composite index on (status, severity) for incidents table'
        },
        {
          pattern: 'date range queries',
          tables: ['incidents', 'rapid_assessments', 'rapid_responses'],
          where: 'WHERE date >= ? AND date <= ?',
          recommendation: 'Ensure date columns have indexes for range queries'
        },
        {
          pattern: 'entity-based filtering',
          tables: ['rapid_assessments', 'rapid_responses'],
          where: 'WHERE affectedEntityId = ?',
          recommendation: 'Ensure foreign key relationships are properly indexed'
        }
      ];

      // This is a simplified analysis - in production you would use query statistics
      for (const query of commonQueries) {
        for (const table of query.tables) {
          // Check if appropriate indexes exist (simplified check)
          const hasAppropriateIndex = tableIndexes[table]?.some((idx: any) => 
            idx.name.includes('status') || 
            idx.name.includes('date') || 
            idx.name.includes('entity')
          );
          
          if (!hasAppropriateIndex) {
            missingIndexes.push(`${table}: ${query.recommendation}`);
          }
        }
      }
    } catch (error) {
      console.error('Index analysis failed:', error);
    }

    const recommendations = [
      'Monitor slow queries using PostgreSQL query statistics',
      'Consider adding composite indexes for frequently filtered columns',
      'Review index usage statistics periodically',
      'Balance between read performance and write overhead',
    ];

    return {
      tableIndexes,
      missingIndexes,
      recommendations,
    };
  }

  async runConnectionPoolTest(): Promise<{
    concurrentResults: PerformanceBenchmark[];
    recommendations: string[];
  }> {
    const concurrentResults: PerformanceBenchmark[] = [];
    const concurrencyLevels = [1, 5, 10, 20, 50];

    for (const concurrency of concurrencyLevels) {
      console.log(`Testing ${concurrency} concurrent connections...`);
      
      try {
        const startTime = Date.now();
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < concurrency; i++) {
          promises.push(DatabaseService.getIncidents({ limit: 10 }));
        }
        
        await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        concurrentResults.push({
          testName: `${concurrency} concurrent connections`,
          duration,
          success: duration < 3000, // 3 second threshold
        });
        
        console.log(`${concurrency} concurrent connections: ${duration}ms`);
      } catch (error) {
        concurrentResults.push({
          testName: `${concurrency} concurrent connections`,
          duration: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const recommendations = [
      'Monitor connection pool usage during peak hours',
      'Adjust pool size based on concurrent connection tests',
      'Consider connection timeouts and retry strategies',
      'Implement proper connection error handling',
    ];

    return { concurrentResults, recommendations };
  }

  private generateReport(): {
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      averageDuration: number;
      slowestTest?: string;
      fastestTest?: string;
    };
    results: PerformanceBenchmark[];
    recommendations: string[];
  } {
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    const totalTests = this.testResults.length;
    
    const durations = this.testResults.map(r => r.duration).filter(d => d > 0);
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
    
    const slowestTest = this.testResults
      .filter(r => r.duration > 0)
      .reduce((slowest, current) => 
        current.duration > slowest.duration ? current : slowest
      , this.testResults[0]);
    
    const fastestTest = this.testResults
      .filter(r => r.duration > 0)
      .reduce((fastest, current) => 
        current.duration < fastest.duration ? current : fastest
      , this.testResults[0]);

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageDuration,
        slowestTest: slowestTest?.testName,
        fastestTest: fastestTest?.testName,
      },
      results: this.testResults,
      recommendations,
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedTests = this.testResults.filter(r => !r.success);
    const slowTests = this.testResults.filter(r => r.duration > 1000);
    
    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed to meet performance thresholds`);
    }
    
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} queries are considered slow (>1s)`);
    }
    
    const averageMemoryIncrease = this.testResults
      .filter(r => r.memoryBefore && r.memoryAfter)
      .reduce((sum, r) => sum + ((r.memoryAfter! - r.memoryBefore!) / 1024 / 1024), 0) / 
      this.testResults.filter(r => r.memoryBefore && r.memoryAfter).length;
    
    if (averageMemoryIncrease > 10) {
      recommendations.push('High memory usage detected - investigate for memory leaks');
    }
    
    recommendations.push(
      'Consider implementing Redis caching for frequently accessed data',
      'Monitor database connection pool usage',
      'Schedule regular performance testing during off-peak hours'
    );

    return recommendations;
  }

  async generateFullReport(): Promise<{
    performanceTests: ReturnType<typeof this.runPerformanceTests>;
    indexAnalysis: ReturnType<typeof this.runIndexAnalysis>;
    connectionTests: ReturnType<typeof this.runConnectionPoolTest>;
    overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  }> {
    console.log('Starting comprehensive database performance analysis...');
    
    const [performanceTests, indexAnalysis, connectionTests] = await Promise.all([
      this.runPerformanceTests(),
      this.runIndexAnalysis(),
      this.runConnectionPoolTest(),
    ]);

    // Calculate overall health score
    const performanceScore = performanceTests.summary.passedTests / performanceTests.summary.totalTests;
    const connectionScore = connectionTests.concurrentResults.filter(r => r.success).length / connectionTests.concurrentResults.length;
    const indexScore = indexAnalysis.missingIndexes.length > 5 ? 0.5 : 1;
    
    const overallScore = (performanceScore + connectionScore + indexScore) / 3;
    
    let overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (overallScore >= 0.9) overallHealth = 'EXCELLENT';
    else if (overallScore >= 0.75) overallHealth = 'GOOD';
    else if (overallScore >= 0.5) overallHealth = 'FAIR';
    else overallHealth = 'POOR';

    return {
      performanceTests,
      indexAnalysis,
      connectionTests,
      overallHealth,
    };
  }

  async exportReportToFile(filepath: string): Promise<void> {
    const report = await this.generateFullReport();
    
    const reportContent = {
      generatedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ...report,
    };

    // In a real implementation, write to file system
    console.log('Performance report generated:', JSON.stringify(reportContent, null, 2));
  }
}

export default DatabasePerformanceTester;

// Basic tests for the DatabasePerformanceTester class
describe('Database Performance Tester', () => {
  let tester: DatabasePerformanceTester;

  beforeEach(() => {
    tester = new DatabasePerformanceTester();
  });

  describe('Performance Testing', () => {
    it('should have a runPerformanceTests method', () => {
      expect(typeof tester.runPerformanceTests).toBe('function');
    });

    it('should have an indexAnalysis method', () => {
      expect(typeof tester.runIndexAnalysis).toBe('function');
    });

    it('should have a connectionPoolTest method', () => {
      expect(typeof tester.runConnectionPoolTest).toBe('function');
    });

    it('should have a fullReport method', () => {
      expect(typeof tester.generateFullReport).toBe('function');
    });
  });

  describe('Mock Performance Test', () => {
    it('should handle basic performance metrics', async () => {
      // Mock DatabaseService methods to avoid actual database calls
      jest.spyOn(DatabaseService, 'getIncidents').mockResolvedValue([]);
      jest.spyOn(DatabaseService, 'getIncidentStats').mockResolvedValue({});
      jest.spyOn(DatabaseService, 'getAffectedEntities').mockResolvedValue([]);
      jest.spyOn(DatabaseService, 'getDonors').mockResolvedValue([]);
      jest.spyOn(DatabaseService, 'getAssessmentAggregations').mockResolvedValue({});
      jest.spyOn(DatabaseService, 'listUsers').mockResolvedValue([]);
      jest.spyOn(DatabaseService, 'getAuditLogs').mockResolvedValue([]);

      const result = await tester.runPerformanceTests();
      
      expect(result.summary.totalTests).toBeGreaterThan(0);
      expect(result.summary.passedTests).toBeGreaterThanOrEqual(0);
      expect(result.summary.failedTests).toBeGreaterThanOrEqual(0);
      expect(result.results.length).toBe(7);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });
});