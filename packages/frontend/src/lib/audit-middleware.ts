// lib/audit-middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SystemActivityLog, SecurityEvent } from '@dms/shared/types/admin';
import { auditLogger } from './audit-logger';

export interface AuditContext {
  userId?: string;
  userName?: string;
  sessionId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent?: string;
  startTime: number;
}

/**
 * Activity logging middleware for API routes
 * Logs all API requests with user context and performance metrics
 */
export async function auditMiddleware(
  request: NextRequest,
  context?: { params: any }
): Promise<NextResponse | void> {
  const startTime = Date.now();
  const url = new URL(request.url);
  
  // Skip audit logging for health checks and static assets
  if (
    url.pathname.includes('/_next/') ||
    url.pathname.includes('/favicon.ico') ||
    url.pathname.includes('/health')
  ) {
    return;
  }

  // Extract user context from JWT token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  const auditContext: AuditContext = {
    userId: token?.sub,
    userName: token?.name,
    sessionId: token?.sessionId as string,
    userRole: token?.role as string,
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || undefined,
    startTime
  };

  // Store context for response logging
  request.auditContext = auditContext;

  return NextResponse.next();
}

/**
 * Log API response after processing
 * Should be called in API route handlers
 */
export async function logApiResponse(
  request: NextRequest,
  response: NextResponse,
  error?: Error
) {
  try {
    const context = request.auditContext as AuditContext;
    if (!context) return;

    const endTime = Date.now();
    const responseTime = endTime - context.startTime;
    const url = new URL(request.url);

    const activityLog: Omit<SystemActivityLog, 'id'> = {
      userId: context.userId || 'anonymous',
      userName: context.userName || 'Anonymous',
      action: `${request.method} ${url.pathname}`,
      resource: 'API',
      resourceId: url.pathname,
      details: {
        queryParams: Object.fromEntries(url.searchParams),
        headers: getRelevantHeaders(request)
      },
      eventType: 'API_ACCESS',
      severity: error ? 'HIGH' : response.status >= 400 ? 'MEDIUM' : 'LOW',
      module: extractModuleFromPath(url.pathname),
      method: request.method,
      endpoint: url.pathname,
      statusCode: response.status,
      responseTime,
      errorMessage: error?.message,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      timestamp: new Date(endTime)
    };

    await auditLogger.logActivity(activityLog);

    // Log security events for suspicious activities
    if (shouldLogSecurityEvent(request, response, error)) {
      await logSecurityEvent(request, response, error, context);
    }
  } catch (auditError) {
    console.error('Audit logging failed:', auditError);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Log security events for authentication failures and permission violations
 */
export async function logSecurityEvent(
  request: NextRequest,
  response: NextResponse,
  error?: Error,
  context?: AuditContext
) {
  try {
    const url = new URL(request.url);
    const ipAddress = context?.ipAddress || getClientIP(request);

    let eventType: SecurityEvent['eventType'] = 'SUSPICIOUS_ACTIVITY';
    let severity: SecurityEvent['severity'] = 'MEDIUM';
    let description = 'Suspicious activity detected';

    // Determine event type based on response and error
    if (response.status === 401) {
      eventType = 'AUTH_FAILURE';
      severity = 'HIGH';
      description = 'Authentication failure';
    } else if (response.status === 403) {
      eventType = 'PERMISSION_VIOLATION';
      severity = 'HIGH';
      description = 'Permission violation - access denied';
    } else if (error && error.message.includes('rate limit')) {
      eventType = 'SUSPICIOUS_ACTIVITY';
      severity = 'MEDIUM';
      description = 'Rate limit exceeded - possible attack';
    } else if (isDataBreachAttempt(request, error)) {
      eventType = 'DATA_BREACH_ATTEMPT';
      severity = 'CRITICAL';
      description = 'Potential data breach attempt detected';
    }

    const securityEvent: Omit<SecurityEvent, 'id'> = {
      eventType,
      severity,
      userId: context?.userId,
      userName: context?.userName,
      ipAddress,
      userAgent: context?.userAgent || request.headers.get('user-agent') || undefined,
      description,
      details: {
        endpoint: url.pathname,
        method: request.method,
        statusCode: response.status,
        error: error?.message,
        queryParams: Object.fromEntries(url.searchParams),
        suspiciousPatterns: detectSuspiciousPatterns(request)
      },
      requiresInvestigation: severity === 'CRITICAL',
      timestamp: new Date()
    };

    await auditLogger.logSecurityEvent(securityEvent);
  } catch (auditError) {
    console.error('Security event logging failed:', auditError);
  }
}

/**
 * Helper function to extract client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

/**
 * Extract relevant headers for logging (excluding sensitive data)
 */
function getRelevantHeaders(request: NextRequest): Record<string, string> {
  const relevantHeaders: Record<string, string> = {};
  
  const headersToInclude = [
    'content-type',
    'accept',
    'accept-language',
    'cache-control',
    'x-requested-with'
  ];

  headersToInclude.forEach(header => {
    const value = request.headers.get(header);
    if (value) {
      relevantHeaders[header] = value;
    }
  });

  return relevantHeaders;
}

/**
 * Extract module name from API path
 */
function extractModuleFromPath(pathname: string): string {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // For API routes: /api/v1/admin/audit -> 'admin'
  // For API routes: /api/v1/assessments -> 'assessments'
  if (pathParts[0] === 'api' && pathParts[1] === 'v1') {
    return pathParts[2] || 'unknown';
  }
  
  return pathParts[0] || 'unknown';
}

/**
 * Determine if we should log this as a security event
 */
function shouldLogSecurityEvent(
  request: NextRequest,
  response: NextResponse,
  error?: Error
): boolean {
  // Log security events for:
  // - Authentication failures (401)
  // - Permission violations (403)
  // - Server errors that might indicate attacks (500 with suspicious patterns)
  // - Rate limiting (429)
  // - Suspicious request patterns
  
  if ([401, 403, 429].includes(response.status)) {
    return true;
  }

  if (response.status >= 500 && detectSuspiciousPatterns(request).length > 0) {
    return true;
  }

  if (error && (
    error.message.includes('rate limit') ||
    error.message.includes('blocked') ||
    error.message.includes('suspicious')
  )) {
    return true;
  }

  return false;
}

/**
 * Detect potential data breach attempts
 */
function isDataBreachAttempt(request: NextRequest, error?: Error): boolean {
  const url = new URL(request.url);
  const suspiciousPatterns = [
    'SELECT * FROM',
    'UNION SELECT',
    'DROP TABLE',
    'INSERT INTO',
    '../../../',
    '<script>',
    'eval(',
    'document.cookie'
  ];

  // Check URL and query parameters
  const fullUrl = url.toString().toLowerCase();
  if (suspiciousPatterns.some(pattern => fullUrl.includes(pattern.toLowerCase()))) {
    return true;
  }

  // Check error messages for SQL injection attempts
  if (error && suspiciousPatterns.some(pattern => 
    error.message.toLowerCase().includes(pattern.toLowerCase())
  )) {
    return true;
  }

  return false;
}

/**
 * Detect suspicious request patterns
 */
function detectSuspiciousPatterns(request: NextRequest): string[] {
  const patterns: string[] = [];
  const url = new URL(request.url);

  // SQL injection patterns
  const sqlInjectionPatterns = ['SELECT', 'UNION', 'DROP', 'INSERT', 'DELETE'];
  const urlString = url.toString().toLowerCase();
  
  sqlInjectionPatterns.forEach(pattern => {
    if (urlString.includes(pattern.toLowerCase())) {
      patterns.push(`SQL_INJECTION_${pattern}`);
    }
  });

  // XSS patterns
  if (urlString.includes('<script>') || urlString.includes('javascript:')) {
    patterns.push('XSS_ATTEMPT');
  }

  // Directory traversal
  if (urlString.includes('../') || urlString.includes('..\\')) {
    patterns.push('DIRECTORY_TRAVERSAL');
  }

  // Excessive query parameters (potential parameter pollution)
  if (url.searchParams.toString().length > 2000) {
    patterns.push('PARAMETER_POLLUTION');
  }

  return patterns;
}

// Extend NextRequest type to include auditContext
declare global {
  namespace globalThis {
    interface NextRequest {
      auditContext?: AuditContext;
    }
  }
}