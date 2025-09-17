-- Create roles if they don't exist
INSERT INTO roles (id, name, "isActive", "createdAt", "updatedAt") VALUES
  ('admin-role-alt', 'ADMIN', true, NOW(), NOW()),
  ('assessor-role-alt', 'ASSESSOR', true, NOW(), NOW()),
  ('responder-role-alt', 'RESPONDER', true, NOW(), NOW()),
  ('coordinator-role-alt', 'COORDINATOR', true, NOW(), NOW()),
  ('verifier-role-alt', 'VERIFIER', true, NOW(), NOW()),
  ('donor-role-alt', 'DONOR', true, NOW(), NOW())
ON CONFLICT (name) DO UPDATE SET 
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = EXCLUDED."updatedAt";

-- Create test users with -alt suffix (without activeRoleId first)
INSERT INTO users (id, email, name, "isActive", "createdAt", "updatedAt") VALUES
  ('admin-user-id-alt', 'admin-alt@test.com', 'Test Admin (Alt)', true, NOW(), NOW()),
  ('assessor-user-id-alt', 'assessor-alt@test.com', 'Test Assessor (Alt)', true, NOW(), NOW()),
  ('responder-user-id-alt', 'responder-alt@test.com', 'Test Responder (Alt)', true, NOW(), NOW()),
  ('coordinator-user-id-alt', 'coordinator-alt@test.com', 'Test Coordinator (Alt)', true, NOW(), NOW()),
  ('verifier-user-id-alt', 'verifier-alt@test.com', 'Test Verifier (Alt)', true, NOW(), NOW()),
  ('donor-user-id-alt', 'donor-alt@test.com', 'Test Donor (Alt)', true, NOW(), NOW()),
  ('superuser-user-id-alt', 'superuser-alt@test.com', 'Super User (Multi-Role) (Alt)', true, NOW(), NOW());

-- Set active roles for each user
UPDATE users SET "activeRoleId" = 'admin-role-alt' WHERE id = 'admin-user-id-alt';
UPDATE users SET "activeRoleId" = 'assessor-role-alt' WHERE id = 'assessor-user-id-alt';
UPDATE users SET "activeRoleId" = 'responder-role-alt' WHERE id = 'responder-user-id-alt';
UPDATE users SET "activeRoleId" = 'coordinator-role-alt' WHERE id = 'coordinator-user-id-alt';
UPDATE users SET "activeRoleId" = 'verifier-role-alt' WHERE id = 'verifier-user-id-alt';
UPDATE users SET "activeRoleId" = 'donor-role-alt' WHERE id = 'donor-user-id-alt';
UPDATE users SET "activeRoleId" = 'admin-role-alt' WHERE id = 'superuser-user-id-alt';

-- For Prisma, we need to create the _RoleToUser join table entries
-- This is a many-to-many relationship table that Prisma creates
INSERT INTO "_RoleToUser" ("A", "B") VALUES
  -- Admin user
  ('admin-role-alt', 'admin-user-id-alt'),
  -- Assessor user
  ('assessor-role-alt', 'assessor-user-id-alt'),
  -- Responder user
  ('responder-role-alt', 'responder-user-id-alt'),
  -- Coordinator user
  ('coordinator-role-alt', 'coordinator-user-id-alt'),
  -- Verifier user
  ('verifier-role-alt', 'verifier-user-id-alt'),
  -- Donor user
  ('donor-role-alt', 'donor-user-id-alt'),
  -- Superuser with all roles
  ('admin-role-alt', 'superuser-user-id-alt'),
  ('assessor-role-alt', 'superuser-user-id-alt'),
  ('responder-role-alt', 'superuser-user-id-alt'),
  ('coordinator-role-alt', 'superuser-user-id-alt'),
  ('verifier-role-alt', 'superuser-user-id-alt'),
  ('donor-role-alt', 'superuser-user-id-alt');