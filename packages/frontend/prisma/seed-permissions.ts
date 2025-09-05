import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default permissions for the DMS system
const defaultPermissions = [
  // Assessment permissions
  { name: 'assessment:create', description: 'Create new assessments', resource: 'assessment', action: 'create' },
  { name: 'assessment:read', description: 'View assessments', resource: 'assessment', action: 'read' },
  { name: 'assessment:update', description: 'Update assessments', resource: 'assessment', action: 'update' },
  { name: 'assessment:delete', description: 'Delete assessments', resource: 'assessment', action: 'delete' },
  { name: 'assessment:assign', description: 'Assign assessments to users', resource: 'assessment', action: 'assign' },

  // Response permissions
  { name: 'response:create', description: 'Create response plans', resource: 'response', action: 'create' },
  { name: 'response:read', description: 'View response plans', resource: 'response', action: 'read' },
  { name: 'response:update', description: 'Update response plans', resource: 'response', action: 'update' },
  { name: 'response:delete', description: 'Delete response plans', resource: 'response', action: 'delete' },
  { name: 'response:execute', description: 'Execute response plans', resource: 'response', action: 'execute' },

  // Verification permissions
  { name: 'verification:create', description: 'Create verification tasks', resource: 'verification', action: 'create' },
  { name: 'verification:read', description: 'View verification tasks', resource: 'verification', action: 'read' },
  { name: 'verification:update', description: 'Update verification status', resource: 'verification', action: 'update' },
  { name: 'verification:approve', description: 'Approve verifications', resource: 'verification', action: 'approve' },
  { name: 'verification:reject', description: 'Reject verifications', resource: 'verification', action: 'reject' },

  // Coordination permissions
  { name: 'coordination:read', description: 'View coordination dashboard', resource: 'coordination', action: 'read' },
  { name: 'coordination:assign', description: 'Assign tasks to users', resource: 'coordination', action: 'assign' },
  { name: 'coordination:monitor', description: 'Monitor system activities', resource: 'coordination', action: 'monitor' },
  { name: 'coordination:report', description: 'Generate reports', resource: 'coordination', action: 'report' },

  // Donor permissions
  { name: 'donor:create', description: 'Create donation commitments', resource: 'donor', action: 'create' },
  { name: 'donor:read', description: 'View donor information', resource: 'donor', action: 'read' },
  { name: 'donor:update', description: 'Update donation status', resource: 'donor', action: 'update' },
  { name: 'donor:track', description: 'Track donation delivery', resource: 'donor', action: 'track' },

  // Admin permissions
  { name: 'admin:users:read', description: 'View user management', resource: 'admin', action: 'users:read' },
  { name: 'admin:users:create', description: 'Create new users', resource: 'admin', action: 'users:create' },
  { name: 'admin:users:update', description: 'Update user information', resource: 'admin', action: 'users:update' },
  { name: 'admin:users:delete', description: 'Delete users', resource: 'admin', action: 'users:delete' },
  { name: 'admin:roles:read', description: 'View role management', resource: 'admin', action: 'roles:read' },
  { name: 'admin:roles:assign', description: 'Assign roles to users', resource: 'admin', action: 'roles:assign' },
  { name: 'admin:system:read', description: 'View system settings', resource: 'admin', action: 'system:read' },
  { name: 'admin:system:update', description: 'Update system settings', resource: 'admin', action: 'system:update' },
  { name: 'admin:audit:read', description: 'View audit logs', resource: 'admin', action: 'audit:read' },
  { name: 'admin:import:execute', description: 'Execute bulk imports', resource: 'admin', action: 'import:execute' },
];

// Role-permission mappings
const rolePermissionMappings = {
  ASSESSOR: [
    'assessment:create', 'assessment:read', 'assessment:update',
    'response:read'
  ],
  RESPONDER: [
    'assessment:read',
    'response:create', 'response:read', 'response:update', 'response:execute',
    'verification:read'
  ],
  COORDINATOR: [
    'assessment:read', 'assessment:update', 'assessment:assign',
    'response:read', 'response:update', 'response:assign',
    'verification:read', 'verification:create', 'verification:update',
    'coordination:read', 'coordination:assign', 'coordination:monitor', 'coordination:report',
    'donor:read'
  ],
  DONOR: [
    'assessment:read',
    'response:read',
    'donor:create', 'donor:read', 'donor:update', 'donor:track'
  ],
  VERIFIER: [
    'assessment:read',
    'response:read',
    'verification:create', 'verification:read', 'verification:update', 
    'verification:approve', 'verification:reject'
  ],
  ADMIN: [
    // All permissions (admin has access to everything)
    ...defaultPermissions.map(p => p.name)
  ]
};

export async function seedPermissions() {
  console.log('Seeding permissions and role assignments...');

  try {
    // Create permissions
    for (const permission of defaultPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          isActive: true
        },
        create: {
          name: permission.name,
          description: permission.description,
          resource: permission.resource,
          action: permission.action,
          isActive: true
        }
      });
    }

    // Create role-permission assignments
    const roles = await prisma.role.findMany();
    const permissions = await prisma.permission.findMany();

    for (const role of roles) {
      const rolePermissionNames = rolePermissionMappings[role.name as keyof typeof rolePermissionMappings];
      if (rolePermissionNames) {
        for (const permissionName of rolePermissionNames) {
          const permission = permissions.find(p => p.name === permissionName);
          if (permission) {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permission.id
                }
              },
              update: {},
              create: {
                roleId: role.id,
                permissionId: permission.id
              }
            });
          }
        }
      }
    }

    console.log('Permissions and role assignments seeded successfully');
    
    // Log summary
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();
    console.log(`Total permissions: ${permissionCount}`);
    console.log(`Total role-permission assignments: ${rolePermissionCount}`);
    
  } catch (error) {
    console.error('Error seeding permissions:', error);
    throw error;
  }
}

export async function main() {
  await seedPermissions();
  await prisma.$disconnect();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}