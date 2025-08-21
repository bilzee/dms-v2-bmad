# 13\. Development Guidelines for LLM-Driven Development

## Code Generation Rules for Claude Code

1. **Always Use TypeScript** - Never generate JavaScript files
2. **Explicit Types** - Define all function parameters and return types
3. **Error Handling** - Wrap all async operations in try-catch
4. **Null Checks** - Always check for null/undefined before access
5. **Exhaustive Switches** - All switch statements must have default case
6. **Consistent Naming** - camelCase for variables, PascalCase for types/components
7. **Comment Complex Logic** - Add explanatory comments for algorithms
8. **Test Everything** - Generate tests alongside implementation

## File Creation Order

When implementing features, create files in this specific order:

1. **Database Schema** (`prisma/schema.prisma`)
2. **Type Definitions** (`shared/types/\*.ts`)
3. **API Routes** (`app/api/v1/\*/route.ts`)
4. **State Stores** (`stores/\*.store.ts`)
5. **Custom Hooks** (`hooks/\*.ts`)
6. **Components** (`components/features/\*/`)
7. **Pages** (`app/(group)/page.tsx`)
8. **Tests** (`\_\_tests\_\_/\*`)

## Component Implementation Pattern

```typescript
// LLM Instruction: Follow this exact pattern for all components

// 1. Imports (grouped and ordered)
import { FC, useState, useEffect } from 'react'; // React
import { useRouter } from 'next/navigation'; // Next.js
import { Button } from '@/components/ui/button'; // UI components
import { useAuthStore } from '@/stores/auth.store'; // Stores
import { api } from '@/lib/api'; // Utilities
import type { Assessment } from '@/shared/types'; // Types

// 2. Interface definitions
interface ComponentProps {
  required: string;
  optional?: number;
  children?: React.ReactNode;
}

// 3. Component implementation
export const ComponentName: FC<ComponentProps> = ({
  required,
  optional = 0,
  children,
}) => {
  // 4. Hooks first
  const router = useRouter();
  const { user } = useAuthStore();
  
  // 5. State
  const \[loading, setLoading] = useState(false);
  
  // 6. Effects
  useEffect(() => {
    // Effect logic
  }, \[/\* dependencies \*/]);
  
  // 7. Handlers
  const handleClick = async () => {
    try {
      setLoading(true);
      // Handler logic
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 8. Render
  return (
    <div>
      {/\* JSX \*/}
    </div>
  );
};
```

## API Route Pattern

```typescript
// LLM Instruction: All API routes must follow this pattern

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/auth';
import { withMiddleware } from '@/lib/middleware';

// Schema definition
const RequestSchema = z.object({
  field: z.string(),
});

// GET handler
export async function GET(request: NextRequest) {
  return withMiddleware(request, async (req, ctx) => {
    // Implementation
    return NextResponse.json({ data: result });
  });
}

// POST handler
export async function POST(request: NextRequest) {
  return withMiddleware(request, async (req, ctx) => {
    const body = await request.json();
    const validated = RequestSchema.parse(body);
    // Implementation
    return NextResponse.json({ data: result }, { status: 201 });
  });
}
```

---
