# 7\. Sequence Diagrams

## LLM Development Notes

These sequences represent the exact flow that must be implemented. Each step includes error handling and offline fallbacks.

## Critical User Workflow: Offline Assessment to Verification

```mermaid
sequenceDiagram
    participant A as Assessor
    participant PWA as PWA Client
    participant SW as Service Worker
    participant IDB as IndexedDB
    participant API as API Server
    participant DB as PostgreSQL
    participant C as Coordinator
    
    %% Offline Assessment Creation
    A->>PWA: Fill Assessment Form
    PWA->>PWA: Validate Input
    PWA->>IDB: Store Assessment (offline)
    IDB-->>PWA: Confirm Storage
    PWA->>IDB: Add to Sync Queue
    PWA-->>A: Show Success (queued)
    
    %% Background Sync Attempt
    SW->>SW: Detect Connectivity
    SW->>IDB: Get Queue Items
    IDB-->>SW: Return Assessments
    SW->>API: POST /api/v1/assessments/batch
    API->>DB: Validate \\\& Store
    DB-->>API: Confirm
    API-->>SW: Return Success/Conflicts
    SW->>IDB: Update Sync Status
    
    %% Verification Flow
    API->>API: Check Auto-Verify Rules
    alt Auto-Verification Passes
        API->>DB: Mark as AUTO\\\_VERIFIED
        API-->>C: Skip Manual Review
    else Manual Verification Required
        C->>PWA: View Verification Queue
        PWA->>API: GET /api/v1/verification/queue
        API->>DB: Fetch Pending Items
        API-->>PWA: Return Queue
        C->>PWA: Verify Assessment
        PWA->>API: POST /api/v1/verification/verify
        API->>DB: Update Status
        API-->>PWA: Confirm
    end
```

## Sync Conflict Resolution Flow

```mermaid
sequenceDiagram
    participant PWA as PWA Client
    participant API as API Server
    participant DB as PostgreSQL
    
    PWA->>API: POST /api/v1/sync/push
    API->>DB: Check for Conflicts
    
    alt No Conflicts
        DB-->>API: Apply Changes
        API-->>PWA: Success
    else Conflict Detected
        DB-->>API: Return Conflict Data
        API-->>PWA: Conflict Response
        PWA->>PWA: Show Conflict UI
        Note over PWA: User chooses resolution
        PWA->>API: POST /api/v1/sync/resolve
        API->>DB: Apply Resolution
        API-->>PWA: Success
    end
```

## Response Planning to Delivery Workflow

```mermaid
sequenceDiagram
    participant R as Responder
    participant PWA as PWA Client
    participant IDB as IndexedDB
    participant API as API Server
    participant DB as PostgreSQL
    participant C as Coordinator
    
    %% Response Planning (Offline)
    R->>PWA: View Verified Assessments
    PWA->>IDB: Get Cached Assessments
    IDB-->>PWA: Return Assessments
    R->>PWA: Create Response Plan
    PWA->>IDB: Store Response (PLANNED)
    PWA->>IDB: Add to Sync Queue
    
    %% Delivery Documentation
    R->>PWA: Update to DELIVERED
    PWA->>PWA: Capture GPS/Photos
    PWA->>IDB: Update Response
    
    %% Sync and Verification
    PWA->>API: POST /api/v1/responses/batch
    API->>DB: Store Responses
    API->>API: Check Auto-Verify Rules
    
    alt Auto-Verification
        API->>DB: Mark AUTO\_VERIFIED
    else Manual Review
        C->>PWA: Review Response
        C->>API: Verify Response
        API->>DB: Update Status
    end
```

## Real-time Monitoring Dashboard Flow

```mermaid
sequenceDiagram
    participant M as Monitor
    participant PWA as PWA Client
    participant WS as WebSocket
    participant API as API Server
    participant DB as PostgreSQL
    participant Field as Field Device
    
    %% Initial Dashboard Load
    M->>PWA: Open Dashboard
    PWA->>API: GET /api/v1/dashboard/overview
    API->>DB: Aggregate Current Data
    DB-->>API: Return Metrics
    API-->>PWA: Dashboard Data
    
    %% WebSocket Connection
    PWA->>WS: Connect WebSocket
    WS-->>PWA: Connection Established
    
    %% Real-time Updates
    Field->>API: Submit Assessment
    API->>DB: Store Assessment
    API->>WS: Broadcast Update
    WS-->>PWA: Real-time Event
    PWA->>PWA: Update Dashboard
    
    %% Drill-down
    M->>PWA: Click Entity
    PWA->>API: GET /api/v1/entities/{id}/details
    API->>DB: Fetch Details
    API-->>PWA: Entity Timeline
```

## Donor Commitment to Verification Flow

```mermaid
sequenceDiagram
    participant D as Donor
    participant PWA as PWA Client
    participant API as API Server
    participant DB as PostgreSQL
    participant R as Responder
    participant C as Coordinator
    
    %% Commitment Registration
    D->>PWA: Register Commitment
    PWA->>API: POST /api/v1/commitments
    API->>DB: Store Commitment
    
    %% Response Linking
    R->>PWA: Create Response
    PWA->>PWA: Link Donor (Optional)
    PWA->>API: POST /api/v1/responses
    API->>DB: Store with Donor Link
    
    %% Delivery \& Verification
    R->>PWA: Document Delivery
    PWA->>API: Update Response
    API->>DB: Update Status
    
    C->>API: Verify Delivery
    API->>DB: Update Verification
    
    %% Donor Notification
    API->>API: Calculate Performance
    API->>DB: Update Donor Score
    API->>D: Send Achievement
```

---
