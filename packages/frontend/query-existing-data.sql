-- Query existing data in the database
SELECT 'incidents' as table_name, COUNT(*) as record_count FROM incidents
UNION ALL
SELECT 'affected_entities' as table_name, COUNT(*) as record_count FROM affected_entities
UNION ALL
SELECT 'assessments' as table_name, COUNT(*) as record_count FROM assessments
UNION ALL
SELECT 'responses' as table_name, COUNT(*) as record_count FROM responses;

-- Show incident data
SELECT i.id, i.title, i.description, i.status, i."severityLevel", i."createdAt", i."updatedAt"
FROM incidents i
LIMIT 10;

-- Show affected entities data
SELECT ae.id, ae.name, ae.type, ae.latitude, ae.longitude, ae."createdAt", ae."updatedAt"
FROM affected_entities ae
LIMIT 10;

-- Show assessments data
SELECT a.id, a.type, a."verificationStatus", a."priorityLevel", a."createdAt", a."updatedAt"
FROM assessments a
LIMIT 10;

-- Show responses data
SELECT r.id, r."responseType", r.status, r."createdAt", r."updatedAt"
FROM responses r
LIMIT 10;

-- Show relationships
SELECT i.id as incident_id, i.title as incident_title, 
       COUNT(DISTINCT ae.id) as entity_count,
       COUNT(DISTINCT a.id) as assessment_count,
       COUNT(DISTINCT r.id) as response_count
FROM incidents i
LEFT JOIN affected_entities ae ON ae.incident_id = i.id
LEFT JOIN assessments a ON a.entity_id = ae.id
LEFT JOIN responses r ON r.entity_id = ae.id
GROUP BY i.id, i.title
LIMIT 10;