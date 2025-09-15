const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestAnalyticsData() {
  console.log('Creating test analytics data...');
  
  try {
    // Get the Northern District Flooding incident
    const incident = await prisma.incident.findFirst({
      where: { name: 'Northern District Flooding' }
    });
    
    if (!incident) {
      console.log('Northern District Flooding incident not found');
      return;
    }
    
    console.log(`Found incident: ${incident.name} (${incident.id})`);
    
    // Create affected entities for this incident
    const affectedEntity1 = await prisma.affectedEntity.create({
      data: {
        type: 'CAMP',
        name: 'Maiduguri IDP Camp',
        lga: 'Maiduguri',
        ward: 'Gwange',
        longitude: 13.0843,
        latitude: 11.8311,
        campName: 'Maiduguri IDP Camp',
        campStatus: 'ACTIVE',
        estimatedPopulation: 1500,
        estimatedHouseholds: 300,
        incidentId: incident.id
      }
    });
    
    const affectedEntity2 = await prisma.affectedEntity.create({
      data: {
        type: 'COMMUNITY',
        name: 'Bama Community',
        lga: 'Bama',
        ward: 'Central',
        longitude: 13.6860,
        latitude: 11.5204,
        communityName: 'Bama Community',
        estimatedPopulation: 2500,
        estimatedHouseholds: 500,
        incidentId: incident.id
      }
    });
    
    console.log(`Created affected entities: ${affectedEntity1.id}, ${affectedEntity2.id}`);
    
    // Create preliminary assessments with realistic impact data
    const prelimAssessment1 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-01-16'),
        reportingLatitude: 11.8311,
        reportingLongitude: 13.0843,
        reportingLGA: 'Maiduguri',
        reportingWard: 'Gwange',
        numberLivesLost: 12,
        numberInjured: 45,
        numberDisplaced: 800,
        numberHousesAffected: 150,
        reportingAgent: 'LEMC Field Officer',
        incidentId: incident.id
      }
    });
    
    const prelimAssessment2 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-01-17'),
        reportingLatitude: 11.5204,
        reportingLongitude: 13.6860,
        reportingLGA: 'Bama',
        reportingWard: 'Central',
        numberLivesLost: 8,
        numberInjured: 32,
        numberDisplaced: 1200,
        numberHousesAffected: 200,
        reportingAgent: 'LEMC Assessment Team',
        incidentId: incident.id
      }
    });
    
    console.log(`Created preliminary assessments: ${prelimAssessment1.id}, ${prelimAssessment2.id}`);
    
    // Create rapid assessments for the affected entities
    const rapidAssessment1 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-01-20'),
        affectedEntityId: affectedEntity1.id,
        assessorName: 'Population Assessment Team 1'
      }
    });
    
    const rapidAssessment2 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-01-22'),
        affectedEntityId: affectedEntity2.id,
        assessorName: 'Population Assessment Team 2'
      }
    });
    
    console.log(`Created rapid assessments: ${rapidAssessment1.id}, ${rapidAssessment2.id}`);
    
    // Create population assessments
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: rapidAssessment1.id,
        totalHouseholds: 300,
        totalPopulation: 1500,
        populationMale: 750,
        populationFemale: 750,
        populationUnder5: 300,
        pregnantWomen: 45,
        lactatingMothers: 60,
        personWithDisability: 75,
        elderlyPersons: 150,
        separatedChildren: 25,
        numberLivesLost: 5,
        numberInjured: 20
      }
    });
    
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: rapidAssessment2.id,
        totalHouseholds: 500,
        totalPopulation: 2500,
        populationMale: 1250,
        populationFemale: 1250,
        populationUnder5: 500,
        pregnantWomen: 75,
        lactatingMothers: 100,
        personWithDisability: 125,
        elderlyPersons: 250,
        separatedChildren: 40,
        numberLivesLost: 3,
        numberInjured: 15
      }
    });
    
    console.log('Created population assessments');
    
    console.log('Test analytics data created successfully!');
    
    // Verify the data
    const summary = await fetch('http://localhost:3000/api/v1/monitoring/analytics/incidents/' + incident.id + '/summary');
    const summaryData = await summary.json();
    console.log('Updated analytics summary:', JSON.stringify(summaryData.data.summary, null, 2));
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAnalyticsData();