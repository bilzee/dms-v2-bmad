import prisma from '@/lib/prisma';

const testUsers = [
  {
    id: "admin-user-id",
    name: "Test Admin",
    email: "admin@test.com",
    roles: ["ADMIN"]
  },
  {
    id: "coordinator-user-id", 
    name: "Test Coordinator",
    email: "coordinator@test.com",
    roles: ["COORDINATOR"]
  },
  {
    id: "assessor-user-id",
    name: "Test Assessor", 
    email: "assessor@test.com",
    roles: ["ASSESSOR"]
  },
  {
    id: "responder-user-id",
    name: "Test Responder",
    email: "responder@test.com", 
    roles: ["RESPONDER"]
  },
  {
    id: "verifier-user-id",
    name: "Test Verifier",
    email: "verifier@test.com",
    roles: ["VERIFIER"]
  },
  {
    id: "donor-user-id",
    name: "Test Donor",
    email: "donor@test.com",
    roles: ["DONOR"]
  },
  {
    id: "superuser-user-id",
    name: "Super User (Multi-Role)", 
    email: "superuser@test.com",
    roles: ["ADMIN", "COORDINATOR", "ASSESSOR", "RESPONDER", "VERIFIER", "DONOR"]
  }
];

async function seedTestUsers() {
  console.log('🌱 Starting test user seeding...');
  
  try {
    for (const testUser of testUsers) {
      console.log(`Creating/updating user: ${testUser.email}`);
      
      // Create or update the user
      const user = await prisma.user.upsert({
        where: { email: testUser.email },
        create: {
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
          isActive: true
        },
        update: {
          id: testUser.id,
          name: testUser.name,
          isActive: true
        }
      });

      console.log(`✅ User created/updated: ${user.email} (ID: ${user.id})`);
      
      // Create roles for the user
      for (const roleName of testUser.roles) {
        const roleId = `${roleName.toLowerCase()}-role-${testUser.id}`;
        
        // First ensure the role exists in the roles table
        const role = await prisma.role.upsert({
          where: { id: roleId },
          create: {
            id: roleId,
            name: roleName,
            isActive: true,
            userId: user.id
          },
          update: {
            name: roleName,
            isActive: true,
            userId: user.id
          }
        });
        
        console.log(`  ✅ Role created/updated: ${role.name} (ID: ${role.id})`);
      }
      
      // Set the first role as the active role
      if (testUser.roles.length > 0) {
        const primaryRole = testUser.roles[0];
        const activeRoleId = `${primaryRole.toLowerCase()}-role-${testUser.id}`;
        
        await prisma.user.update({
          where: { id: user.id },
          data: { activeRoleId: activeRoleId }
        });
        
        console.log(`  ✅ Set active role: ${primaryRole}`);
      }
    }
    
    console.log('🎉 Test user seeding completed successfully!');
    
    // Verify by listing all users
    const allUsers = await prisma.user.findMany({
      include: {
        roles: true
      }
    });
    
    console.log('\n📋 Current users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
      console.log(`    Roles: ${user.roles.map(r => r.name).join(', ')}`);
      console.log(`    Active Role ID: ${user.activeRoleId}`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedTestUsers().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});