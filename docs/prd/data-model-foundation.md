# Data Model Foundation

## Existing Data Model Reference
**Foundation Document:** "DMS Data Model Detailed v3.0.md" provides the structural foundation for PWA implementation.

## Core Entities

### Primary Entities
- **Incident:** Central disaster incident with severity classification, status progression (Active → Contained → Resolved), and type categorization
- **PreliminaryAssessment:** Initial impact reports capable of triggering incident creation (though incidents may be coordinator-created independently)
- **AffectedEntity:** Camp or Community entities requiring assessment and response intervention
- **RapidAssessment:** Six assessment types (Health, WASH, Shelter, Food, Security, Population) with entity-specific field structures
- **RapidResponse:** Response delivery tracking including items, quantities, and donor attribution

## Current Data Model Characteristics

### Assessment Structure
- **MVP Implementation:** Primarily boolean-based fields (e.g., hasFunctionalClinic, isWaterSufficient, areSheltersSufficient)
- **Gap Analysis:** Boolean-based assessment methodology for MVP phase
- **Future Evolution:** Post-MVP transition to quantitative measurements enabling resource-based gap analysis (required vs. delivered resources)

### Relationship Architecture
- **Entity Relationships:** Clear one-to-many relationships between incidents, entities, assessments, and responses
- **Incident-Entity Mapping:** Many-to-many relationships between incidents and affected entities
- **Offline Compatibility:** Entity structure optimized for offline data capture and synchronization

## Data Model Limitations & Extensions

### Current Scope Limitations
**Existing Coverage:** Assessments, Responses, Incidents, Preliminary Assessments, Affected Entities
**Missing Components:** Admin functionality, User management, Role definitions, Donor entities, audit trails

### Required Extensions for PWA Implementation
- **User Management:** User entities with role assignments and permissions
- **Verification Status Fields:** Extended data model including verification indicators (Verified/Auto-approved/Pending)
- **Sync Priority Flagging:** Configurable critical assessment indicators for prioritized synchronization
- **Audit Trail Structure:** Comprehensive activity logging for accountability and compliance

## Key Implementation Considerations

### Cross-Role Data Sharing
- **Shared Access:** Incident and AffectedEntity information accessible across Assessor, Responder, Coordinator, and Donor roles
- **Assessment-Response Linking:** Direct linkage between RapidAssessment and RapidResponse records for workflow continuity
- **Data Consistency:** Synchronized entity information across all user roles
