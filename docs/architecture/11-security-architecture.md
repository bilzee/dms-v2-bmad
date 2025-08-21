# 11\. Security Architecture

## LLM Implementation Notes

Security is implemented in layers. Each layer must be explicitly implemented. Never skip security checks for convenience.

## Security Layers

### 1\. Data Encryption

```typescript
// lib/security/encryption.ts
// LLM Note: AES-256-GCM encryption for offline data

export class EncryptionService {
  private static instance: EncryptionService;
  private key: CryptoKey | null = null;
  
  static getInstance(): EncryptionService {
    if (!this.instance) {
      this.instance = new EncryptionService();
    }
    return this.instance;
  }
  
  async initialize(): Promise<void> {
    // Device-specific key generation
    const storedKey = localStorage.getItem('deviceKey');
    
    if (!storedKey) {
      // Generate new key
      this.key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        \['encrypt', 'decrypt']
      );
      
      // Export and store
      const exported = await crypto.subtle.exportKey('jwk', this.key);
      localStorage.setItem('deviceKey', JSON.stringify(exported));
    } else {
      // Import existing key
      this.key = await crypto.subtle.importKey(
        'jwk',
        JSON.parse(storedKey),
        { name: 'AES-GCM' },
        false,
        \['encrypt', 'decrypt']
      );
    }
  }
  
  async encrypt(data: any): Promise<{ encrypted: string; iv: string }> {
    if (!this.key) await this.initialize();
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.key!,
      encoded
    );
    
    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }
  
  async decrypt(encrypted: string, iv: string): Promise<any> {
    if (!this.key) await this.initialize();
    
    const encryptedData = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const ivData = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivData },
      this.key!,
      encryptedData
    );
    
    return JSON.parse(new TextDecoder().decode(decrypted));
  }
}
```

### 2\. Authentication \& Authorization

```typescript
// lib/auth/index.ts
// LLM Note: NextAuth configuration with role-based access

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 \* 60 \* 60, // 24 hours
  },
  
  providers: \[
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            roles: {
              include: {
                permissions: true,
              },
            },
          },
        });
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          throw new Error('Invalid password');
        }
        
        // Flatten permissions
        const permissions = user.roles.flatMap(role => 
          role.permissions.map(p => p.name)
        );
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles.map(r => r.role),
          permissions: \[...new Set(permissions)], // Unique permissions
        };
      },
    }),
  ],
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string\[];
        session.user.permissions = token.permissions as string\[];
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

// Permission check middleware
export function requirePermission(permission: string) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.permissions?.includes(permission)) {
      throw new Error('Insufficient permissions');
    }
    
    return session;
  };
}

// Role check middleware  
export function requireRole(role: string) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.roles?.includes(role)) {
      throw new Error('Insufficient role');
    }
    
    return session;
  };
}
```

### 3\. API Security Headers

```typescript
// middleware.ts
// LLM Note: Security headers for all API routes

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the response
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );
  
  // CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED\_ORIGIN || '\*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  return response;
}

export const config = {
  matcher: '/((?!\_next/static|\_next/image|favicon.ico).\*)',
};
```

## Data Privacy \& Compliance

```typescript
// lib/privacy/anonymization.ts
// LLM Note: Data anonymization for compliance

export class DataAnonymizer {
  // Remove PII from exported data
  static anonymizeAssessment(assessment: any): any {
    return {
      ...assessment,
      assessorName: this.hashString(assessment.assessorName),
      assessorId: this.hashString(assessment.assessorId),
      // Keep operational data intact
      affectedEntityId: assessment.affectedEntityId,
      type: assessment.type,
      data: assessment.data,
      verificationStatus: assessment.verificationStatus,
    };
  }
  
  static anonymizeResponse(response: any): any {
    return {
      ...response,
      responderName: this.hashString(response.responderName),
      responderId: this.hashString(response.responderId),
      donorName: response.donorName ? this.hashString(response.donorName) : null,
      // Keep operational data
      affectedEntityId: response.affectedEntityId,
      responseType: response.responseType,
      data: response.data,
      status: response.status,
    };
  }
  
  private static hashString(input: string): string {
    // One-way hash for consistency in reports
    const hash = crypto.createHash('sha256');
    hash.update(input + process.env.ANONYMIZATION\_SALT);
    return hash.digest('hex').substring(0, 8);
  }
}

// Audit logging
export class AuditLogger {
  static async log(action: string, entityType: string, entityId: string, userId: string, metadata?: any) {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        metadata: metadata || {},
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        timestamp: new Date(),
      },
    });
  }
}
```

---
