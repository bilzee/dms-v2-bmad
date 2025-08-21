# 14\. Testing Strategy

## LLM Testing Implementation Guide

```typescript
// \_\_tests\_\_/components/AssessmentForm.test.tsx
// LLM Note: Test pattern for components

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssessmentForm } from '@/components/features/assessment/AssessmentForm';
import { useOfflineStore } from '@/stores/offline.store';

// Mock stores
jest.mock('@/stores/offline.store');

describe('AssessmentForm', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });
  
  it('should render form fields', () => {
    render(<AssessmentForm type="HEALTH" entityId="123" />);
    
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
  
  it('should queue assessment when offline', async () => {
    const mockQueue = jest.fn();
    (useOfflineStore as jest.Mock).mockReturnValue({
      isOffline: true,
      queueAssessment: mockQueue,
    });
    
    render(<AssessmentForm type="HEALTH" entityId="123" />);
    
    fireEvent.submit(screen.getByRole('form'));
    
    await waitFor(() => {
      expect(mockQueue).toHaveBeenCalled();
    });
  });
});
```

---
