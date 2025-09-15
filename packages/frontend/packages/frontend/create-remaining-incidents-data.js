const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRemainingIncidentsData() {
  console.log('Creating test data for remaining incidents...');
  
  try {
    // Get the Eastern Region Drought incident
    const droughtIncident = await prisma.incident.findFirst({
      where: { name: 'Eastern Region Drought' }
    });
    
    // Get the Central Market Fire incident  
    const fireIncident = await prisma.incident.findFirst({
      where: { name: 'Central Market Fire' }
    });
    
    if (!droughtIncident || !fireIncident) {
      console.log('One or both incidents not found');
      return;
    }
    
    console.log(`Found incidents: ${droughtIncident.name} (${droughtIncident.id}), ${fireIncident.name} (${fireIncident.id})`);
    
    // Create data for Eastern Region Drought
    console.log('Creating data for Eastern Region Drought...');
    
    const droughtEntity1 = await prisma.affectedEntity.create({
      data: {
        type: 'COMMUNITY',
        name: 'Damaturu Rural Community',
        lga: 'Damaturu',
        ward: 'Sabon Gari',
        longitude: 11.7471,
        latitude: 11.7471,
        communityName: 'Damaturu Rural Community',
        estimatedPopulation: 3200,
        estimatedHouseholds: 640,
        incidentId: droughtIncident.id
      }
    });
    
    const droughtEntity2 = await prisma.affectedEntity.create({
      data: {
        type: 'COMMUNITY',
        name: 'Potiskum Farming Villages',
        lga: 'Potiskum',
        ward: 'Dogo Tebo',
        longitude: 11.7108,
        latitude: 11.7108,
        communityName: 'Potiskum Farming Villages',
        estimatedPopulation: 2800,
        estimatedHouseholds: 560,
        incidentId: droughtIncident.id
      }
    });
    
    // Create preliminary assessments for drought
    const droughtPrelim1 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-03-12'),
        reportingLatitude: 11.7471,
        reportingLongitude: 11.7471,
        reportingLGA: 'Damaturu',
        reportingWard: 'Sabon Gari',
        numberLivesLost: 15,
        numberInjured: 25,
        numberDisplaced: 1500,
        numberHousesAffected: 80,
        reportingAgent: 'NEMA Assessment Team',
        incidentId: droughtIncident.id
      }
    });
    
    const droughtPrelim2 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-03-14'),
        reportingLatitude: 11.7108,
        reportingLongitude: 11.7108,
        reportingLGA: 'Potiskum',
        reportingWard: 'Dogo Tebo',
        numberLivesLost: 8,
        numberInjured: 18,
        numberDisplaced: 1200,
        numberHousesAffected: 60,
        reportingAgent: 'Local Emergency Team',
        incidentId: droughtIncident.id
      }
    });
    
    // Create rapid assessments for drought
    const droughtRapid1 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-03-18'),
        affectedEntityId: droughtEntity1.id,
        assessorName: 'Population Assessment Team A'
      }
    });
    
    const droughtRapid2 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-03-20'),
        affectedEntityId: droughtEntity2.id,
        assessorName: 'Population Assessment Team B'
      }
    });
    
    // Create population assessments for drought
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: droughtRapid1.id,
        totalHouseholds: 640,
        totalPopulation: 3200,
        populationMale: 1600,
        populationFemale: 1600,
        populationUnder5: 640,
        pregnantWomen: 96,
        lactatingMothers: 128,
        personWithDisability: 160,
        elderlyPersons: 320,
        separatedChildren: 32,
        numberLivesLost: 7,
        numberInjured: 12
      }
    });
    
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: droughtRapid2.id,
        totalHouseholds: 560,
        totalPopulation: 2800,
        populationMale: 1400,
        populationFemale: 1400,
        populationUnder5: 560,
        pregnantWomen: 84,
        lactatingMothers: 112,
        personWithDisability: 140,
        elderlyPersons: 280,
        separatedChildren: 28,
        numberLivesLost: 4,
        numberInjured: 8
      }
    });
    
    console.log('Drought incident data created successfully!');
    
    // Create data for Central Market Fire
    console.log('Creating data for Central Market Fire...');
    
    const fireEntity1 = await prisma.affectedEntity.create({
      data: {
        type: 'COMMUNITY',
        name: 'Central Market District',
        lga: 'Maiduguri',
        ward: 'Bolori',
        longitude: 13.1571,
        latitude: 11.8469,
        communityName: 'Central Market District',
        estimatedPopulation: 1800,
        estimatedHouseholds: 360,
        incidentId: fireIncident.id
      }
    });
    
    const fireEntity2 = await prisma.affectedEntity.create({
      data: {
        type: 'COMMUNITY',
        name: 'Monday Market Area',
        lga: 'Maiduguri',
        ward: 'Gwange',
        longitude: 13.1600,
        latitude: 11.8500,
        communityName: 'Monday Market Area',
        estimatedPopulation: 1200,
        estimatedHouseholds: 240,
        incidentId: fireIncident.id
      }
    });
    
    // Create preliminary assessments for fire
    const firePrelim1 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-02-21'),
        reportingLatitude: 11.8469,
        reportingLongitude: 13.1571,
        reportingLGA: 'Maiduguri',
        reportingWard: 'Bolori',
        numberLivesLost: 3,
        numberInjured: 28,
        numberDisplaced: 450,
        numberHousesAffected: 85,
        reportingAgent: 'Fire Service Assessment',
        incidentId: fireIncident.id
      }
    });
    
    const firePrelim2 = await prisma.preliminaryAssessment.create({
      data: {
        reportingDate: new Date('2024-02-22'),
        reportingLatitude: 11.8500,
        reportingLongitude: 13.1600,
        reportingLGA: 'Maiduguri',
        reportingWard: 'Gwange',
        numberLivesLost: 1,
        numberInjured: 15,
        numberDisplaced: 300,
        numberHousesAffected: 45,
        reportingAgent: 'LEMC Fire Response Team',
        incidentId: fireIncident.id
      }
    });
    
    // Create rapid assessments for fire
    const fireRapid1 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-02-25'),
        affectedEntityId: fireEntity1.id,
        assessorName: 'Emergency Population Team 1'
      }
    });
    
    const fireRapid2 = await prisma.rapidAssessment.create({
      data: {
        rapidAssessmentType: 'Population',
        rapidAssessmentDate: new Date('2024-02-26'),
        affectedEntityId: fireEntity2.id,
        assessorName: 'Emergency Population Team 2'
      }
    });
    
    // Create population assessments for fire
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: fireRapid1.id,
        totalHouseholds: 360,
        totalPopulation: 1800,
        populationMale: 900,
        populationFemale: 900,
        populationUnder5: 360,
        pregnantWomen: 54,
        lactatingMothers: 72,
        personWithDisability: 90,
        elderlyPersons: 180,
        separatedChildren: 18,
        numberLivesLost: 2,
        numberInjured: 15
      }
    });
    
    await prisma.populationAssessment.create({
      data: {
        rapidAssessmentId: fireRapid2.id,
        totalHouseholds: 240,
        totalPopulation: 1200,
        populationMale: 600,
        populationFemale: 600,
        populationUnder5: 240,
        pregnantWomen: 36,
        lactatingMothers: 48,
        personWithDisability: 60,
        elderlyPersons: 120,
        separatedChildren: 12,
        numberLivesLost: 1,
        numberInjured: 8
      }
    });
    
    console.log('Fire incident data created successfully!');
    
    // Verify the data for both incidents
    console.log('\\nVerifying updated analytics for all incidents...');
    
    const droughtSummary = await fetch('http://localhost:3000/api/v1/monitoring/analytics/incidents/' + droughtIncident.id + '/summary');
    const droughtData = await droughtSummary.json();
    console.log('\\nEastern Region Drought summary:', JSON.stringify(droughtData.data.summary, null, 2));
    
    const fireSummary = await fetch('http://localhost:3000/api/v1/monitoring/analytics/incidents/' + fireIncident.id + '/summary');
    const fireData = await fireSummary.json();
    console.log('\\nCentral Market Fire summary:', JSON.stringify(fireData.data.summary, null, 2));
    
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRemainingIncidentsData();