const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyData() {
  try {
    console.log('Verifying restored data...\n');
    
    // Check incidents
    const incidents = await prisma.incident.findMany();
    console.log(`Incidents: ${incidents.length}`);
    console.log(`Active incidents: ${incidents.filter(i => i.status === 'ACTIVE').length}`);
    
    // Check affected entities
    const affectedEntities = await prisma.affectedEntity.findMany();
    console.log(`Affected Entities: ${affectedEntities.length}`);
    
    // Check assessments
    const rapidAssessments = await prisma.rapidAssessment.count();
    console.log(`Rapid Assessments: ${rapidAssessments}`);
    
    // Check today's assessments
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayAssessments = await prisma.rapidAssessment.count({
      where: { createdAt: { gte: todayStart } }
    });
    console.log(`Today's Assessments: ${todayAssessments}`);
    
    // Check responses
    const responses = await prisma.rapidResponse.count();
    const pendingResponses = await prisma.rapidResponse.count({
      where: { status: { in: ['PLANNED', 'IN_PROGRESS'] } }
    });
    console.log(`Total Responses: ${responses}`);
    console.log(`Pending Responses: ${pendingResponses}`);
    
    // Check users
    const users = await prisma.user.count({ where: { isActive: true } });
    console.log(`Active Users: ${users}`);
    
    console.log('\nData verification completed!');
    
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();