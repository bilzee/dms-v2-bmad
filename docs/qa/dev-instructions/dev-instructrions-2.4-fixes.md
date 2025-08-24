 Dev Agent Instructions - Story 2.4 Fixes

  Based on the QA review, here are the specific instructions for addressing the
  identified concerns:

  Priority 1: Critical Fixes (Required before production)

  1. Fix Completion API Endpoint JSON Response

  File: packages/frontend/src/app/api/v1/responses/[id]/complete/route.ts

  Issue: Endpoint returns HTML 404 page instead of proper JSON response for non-existent
   resources.

  Fix Required:
  // In the PATCH function, ensure all error responses return JSON
  // Replace any Next.js redirect/notFound calls with proper JSON responses
  export async function PATCH(request: NextRequest, { params }: { params: { id: string }
   }) {
    try {
      // ... existing logic ...
    } catch (error) {
      // Ensure this always returns JSON, never HTML
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }

  Test: curl -X PATCH http://localhost:3000/api/v1/responses/test-123/complete -H 
  "Content-Type: application/json" -d '{}' should return JSON, not HTML.

  2. Implement Data Encryption for Sensitive Information

  Files:
  - packages/frontend/src/components/features/response/BeneficiaryVerification.tsx
  - packages/frontend/src/components/features/response/GPSDeliveryStamp.tsx

  Issue: Sensitive PII data (beneficiary demographics, GPS coordinates) stored in plain
  text.

  Fix Required:
  1. Add encryption utilities:
  // Create: packages/shared/utils/encryption.ts
  export async function encryptSensitiveData(data: string): Promise<string> {
    // Implement AES-256-GCM encryption
    // Use Web Crypto API for client-side encryption
  }

  export async function decryptSensitiveData(encryptedData: string): Promise<string> {
    // Implement decryption counterpart
  }

  2. Encrypt before storage:
  // In BeneficiaryVerification.tsx - before saving to store/API
  const encryptedDemographics = await
  encryptSensitiveData(JSON.stringify(demographicBreakdown));

  // In GPSDeliveryStamp.tsx - before saving coordinates
  const encryptedLocation = await encryptSensitiveData(JSON.stringify({ latitude,
  longitude }));

  3. Decrypt when displaying:
  // When loading data for display
  const demographics = JSON.parse(await decryptSensitiveData(encryptedDemographics));

  Priority 2: File List Updates (Documentation)

  File: docs/stories/2.4.delivery-documentation.md

  Update Required: Add QA-created files to the File List section:

  **Test Coverage:** (ADD THESE LINES)
  - `packages/frontend/__tests__/components/features/response/DeliveryPhotoCapture.test.
  tsx` - Photo capture component tests

  **API Endpoints Enhanced/Created:** (ADD THIS LINE)
  - `packages/frontend/src/app/api/v1/responses/[id]/documentation/route.ts` - New
  documentation retrieval endpoint

  Priority 3: Enhancement Fixes (Nice to have)

  3. Add Photo Validation and Security

  File: packages/frontend/src/components/features/response/DeliveryPhotoCapture.tsx

  Enhancement:
  // Add photo validation function
  const validatePhotoSecurity = async (file: File): Promise<boolean> => {
    // Check file headers for malicious content
    // Validate image format integrity
    // Scan for embedded scripts (basic XSS protection)
    return true; // or false if invalid
  };

  // Use in photo processing pipeline
  if (!await validatePhotoSecurity(file)) {
    setCaptureError('Invalid or potentially unsafe photo file');
    return;
  }

  4. Add Audit Trail Logging

  All delivery components

  Enhancement: Add audit logging for sensitive operations:
  // Create: packages/shared/utils/auditLog.ts
  export const auditLog = {
    deliveryDocumentationAccessed: (responseId: string, userId: string) => {
      // Log access to delivery documentation
    },
    beneficiaryDataViewed: (responseId: string, userId: string) => {
      // Log viewing of sensitive beneficiary data
    },
    gpsLocationCaptured: (responseId: string, coordinates: GPSCoordinates) => {
      // Log GPS coordinate capture events
    }
  };

  Testing Instructions

  After implementing fixes:

  1. Run existing tests:
  cd packages/frontend
  pnpm test DeliveryDocumentationForm.test.tsx
  pnpm test BeneficiaryVerification.test.tsx
  pnpm test GPSDeliveryStamp.test.tsx
  pnmp test DeliveryPhotoCapture.test.tsx

  2. Test API endpoints:
  # Test completion endpoint returns JSON
  curl -X PATCH http://localhost:3000/api/v1/responses/test-123/complete -H
  "Content-Type: application/json" -d '{}'

  # Test new documentation endpoint
  curl -X GET http://localhost:3000/api/v1/responses/test-123/documentation

  3. Test encryption functionality:
  - Verify beneficiary data is encrypted in storage
  - Verify GPS coordinates are encrypted in storage
  - Test decryption on data retrieval

  Acceptance Criteria

  Fixes are complete when:
  - Completion API returns proper JSON responses (not HTML)
  - Sensitive data encryption implemented and tested
  - File list updated in story documentation
  - All existing tests still pass
  - New encryption functionality has basic test coverage

  Security Note

  The encryption implementation is critical for production deployment. Use
  industry-standard encryption libraries and ensure proper key management. Consider
  using environment variables for encryption keys and never commit keys to the
  repository.