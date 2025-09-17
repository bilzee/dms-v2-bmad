-- Query existing data in the database
SELECT 'incidents' as table_name, COUNT(*) as record_count FROM incidents
UNION ALL
SELECT 'affected_entities' as table_name, COUNT(*) as record_count FROM affected_entities
UNION ALL
SELECT 'rapid_assessments' as table_name, COUNT(*) as record_count FROM rapid_assessments
UNION ALL
SELECT 'rapid_responses' as table_name, COUNT(*) as record_count FROM rapid_responses;

-- Show incident data
SELECT i.id, i.name, i.type, i."subType", i.source, i.severity, i.status, i.date, i."createdAt", i."updatedAt"
FROM incidents i
LIMIT 10;

-- Show affected entities data
SELECT ae.id, ae.type, ae.name, ae.lga, ae.ward, ae.latitude, ae.longitude, ae."incidentId", ae."createdAt", ae."updatedAt"
FROM affected_entities ae
LIMIT 10;

-- Show rapid assessments data
SELECT ra.id, ra."rapidAssessmentType", ra."rapidAssessmentDate", ra."assessorName", ra."affectedEntityId", ra."createdAt", ra."updatedAt"
FROM rapid_assessments ra
LIMIT 10;

-- Show rapid responses data
SELECT rr.id, rr."responseType", rr.status, rr."plannedDate", rr."deliveredDate", rr."affectedEntityId", rr."responderName", rr."createdAt", rr."updatedAt"
FROM rapid_responses rr
LIMIT 10;

-- Show relationships
SELECT i.id as incident_id, i.name as incident_name, 
       COUNT(DISTINCT ae.id) as entity_count,
       COUNT(DISTINCT ra.id) as assessment_count,
       COUNT(DISTINCT rr.id) as response_count
FROM incidents i
LEFT JOIN affected_entities ae ON ae."incidentId" = i.id
LEFT JOIN rapid_assessments ra ON ra."affectedEntityId" = ae.id
LEFT JOIN rapid_responses rr ON rr."affectedEntityId" = ae.id
GROUP BY i.id, i.name
LIMIT 10;