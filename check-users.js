const { PrismaClient } = require('./packages/frontend/node_modules/.prisma/client');
const prisma = new PrismaClient();

async function checkExistingUsers() {
  try {
    console.log('🔍 Thoroughly checking for existing users...');
    
    // Check all users
    const allUsers = await prisma.user.findMany({
      include: {
        activeRole: true,
        roles: true
      }
    });
    
    console.log('📊 Total users found:', allUsers.length);
    console.log('📋 All user details:');
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
      console.log(`     Name: ${user.name || 'N/A'}`);
      console.log(`     Active Role: ${user.activeRole?.name || 'None'}`);
      console.log(`     All Roles: ${user.roles.map(r => r.name).join(', ')}`);
      console.log(`     Active: ${user.isActive}`);
      console.log('');
    });
    
    // Check specific test users from the auth config
    const testEmails = [
      'admin@test.com',
      'assessor@test.com', 
      'responder@test.com',
      'coordinator@test.com',
      'verifier@test.com',
      'donor@test.com',
      'superuser@test.com'
    ];
    
    console.log('🔍 Checking for specific test users:');
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          activeRole: true,
          roles: true
        }
      });
      
      if (user) {
        console.log(`✅ Found: ${email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Roles: ${user.roles.map(r => r.name).join(', ')}`);
      } else {
        console.log(`❌ Not found: ${email}`);
      }
    }
    
    // Check accounts table for auth providers
    console.log('\n🔍 Checking accounts table...');
    const accounts = await prisma.account.findMany({
      include: {
        user: {
          include: {
            activeRole: true,
            roles: true
          }
        }
      }
    });
    
    console.log('📊 Total accounts found:', accounts.length);
    accounts.forEach(account => {
      console.log(`   - Provider: ${account.provider}, User: ${account.user?.email || 'Unknown'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingUsers();