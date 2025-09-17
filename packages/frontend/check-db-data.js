const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('Checking database data...');
    
    const incidents = await prisma.incident.findMany();
    console.log(`\nIncidents (${incidents.length}):`);
    incidents.forEach(incident => {
      console.log(`- ${incident.id}: ${incident.name} (${incident.type})`);
    });
    
    const entities = await prisma.affectedEntity.findMany();
    console.log(`\nAffected Entities (${entities.length}):`);
    entities.forEach(entity => {
      console.log(`- ${entity.id}: ${entity.name} (${entity.type}) at [${entity.latitude}, ${entity.longitude}]`);
    });
    
    const assessments = await prisma.rapidAssessment.findMany();
    console.log(`\nRapid Assessments (${assessments.length}):`);
    assessments.forEach(assessment => {
      console.log(`- ${assessment.id}: ${assessment.rapidAssessmentType} for entity ${assessment.affectedEntityId}`);
    });
    
    const responses = await prisma.rapidResponse.findMany();
    console.log(`\nRapid Responses (${responses.length}):`);
    responses.forEach(response => {
      console.log(`- ${response.id}: ${response.responseType} (${response.status}) for entity ${response.affectedEntityId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();