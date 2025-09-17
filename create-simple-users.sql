-- Create test users with -alt suffix (without activeRoleId first)
INSERT INTO users (id, email, name, "isActive", "createdAt", "updatedAt") VALUES
  ('admin-user-id-alt', 'admin-alt@test.com', 'Test Admin (Alt)', true, NOW(), NOW()),
  ('assessor-user-id-alt', 'assessor-alt@test.com', 'Test Assessor (Alt)', true, NOW(), NOW()),
  ('responder-user-id-alt', 'responder-alt@test.com', 'Test Responder (Alt)', true, NOW(), NOW()),
  ('coordinator-user-id-alt', 'coordinator-alt@test.com', 'Test Coordinator (Alt)', true, NOW(), NOW()),
  ('verifier-user-id-alt', 'verifier-alt@test.com', 'Test Verifier (Alt)', true, NOW(), NOW()),
  ('donor-user-id-alt', 'donor-alt@test.com', 'Test Donor (Alt)', true, NOW(), NOW()),
  ('superuser-user-id-alt', 'superuser-alt@test.com', 'Super User (Multi-Role) (Alt)', true, NOW(), NOW());