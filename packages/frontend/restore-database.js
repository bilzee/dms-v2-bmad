const fs = require('fs').promises;
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreDatabase() {
  const backupPath = path.join(__dirname, 'database-backup.json');
  
  try {
    console.log('Starting database restore...');
    
    // Read backup file
    const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
    
    // Clear existing data only for tables that exist
    console.log('Clearing existing data...');
    
    // Try to clear each table, but continue if it fails
    const tablesToClear = [
      'incident',
      'affectedEntity', 
      'preliminaryAssessment',
      'rapidAssessment',
      'healthAssessment',
      'populationAssessment',
      'foodAssessment',
      'shelterAssessment',
      'securityAssessment',
      'rapidResponse',
      'donor',
      'user',
      'role',
      'account'
    ];
    
    for (const table of tablesToClear) {
      try {
        if (prisma[table] && typeof prisma[table].deleteMany === 'function') {
          await prisma[table].deleteMany();
          console.log(`Cleared ${table}`);
        }
      } catch (error) {
        console.log(`Skipped clearing ${table}: ${error.message}`);
      }
    }
    
    // Restore data in correct order
    console.log('Restoring data...');
    
    // Restore incidents
    if (backupData.incidents && backupData.incidents.length > 0) {
      await prisma.incident.createMany({
        data: backupData.incidents,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.incidents.length} incidents`);
    }
    
    // Restore affected entities
    if (backupData.affectedEntities && backupData.affectedEntities.length > 0) {
      await prisma.affectedEntity.createMany({
        data: backupData.affectedEntities,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.affectedEntities.length} affected entities`);
    }
    
    // Restore assessments
    const assessmentTypes = [
      { backupKey: 'preliminaryAssessments', model: 'preliminaryAssessment' },
      { backupKey: 'rapidAssessments', model: 'rapidAssessment' },
      { backupKey: 'healthAssessments', model: 'healthAssessment' },
      { backupKey: 'populationAssessments', model: 'populationAssessment' },
      { backupKey: 'foodAssessments', model: 'foodAssessment' },
      { backupKey: 'shelterAssessments', model: 'shelterAssessment' },
      { backupKey: 'securityAssessments', model: 'securityAssessment' }
    ];
    
    for (const { backupKey, model } of assessmentTypes) {
      if (backupData[backupKey] && backupData[backupKey].length > 0) {
        try {
          await prisma[model].createMany({
            data: backupData[backupKey],
            skipDuplicates: true
          });
          console.log(`Restored ${backupData[backupKey].length} ${backupKey}`);
        } catch (error) {
          console.log(`Skipped ${backupKey}: ${error.message}`);
        }
      }
    }
    
    // Restore responses
    if (backupData.rapidResponses && backupData.rapidResponses.length > 0) {
      await prisma.rapidResponse.createMany({
        data: backupData.rapidResponses,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.rapidResponses.length} responses`);
    }
    
    // Restore users and roles
    if (backupData.roles && backupData.roles.length > 0) {
      await prisma.role.createMany({
        data: backupData.roles,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.roles.length} roles`);
    }
    
    if (backupData.users && backupData.users.length > 0) {
      await prisma.user.createMany({
        data: backupData.users,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.users.length} users`);
    }
    
    // Restore accounts
    if (backupData.accounts && backupData.accounts.length > 0) {
      await prisma.account.createMany({
        data: backupData.accounts,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.accounts.length} accounts`);
    }
    
    // Restore donors
    if (backupData.donors && backupData.donors.length > 0) {
      await prisma.donor.createMany({
        data: backupData.donors,
        skipDuplicates: true
      });
      console.log(`Restored ${backupData.donors.length} donors`);
    }
    
    console.log('Database restore completed successfully!');
    
  } catch (error) {
    console.error('Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase()
  .catch((error) => {
    console.error('Restore script failed:', error);
    process.exit(1);
  });