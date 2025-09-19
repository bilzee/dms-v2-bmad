const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('Starting database backup...');
  
  try {
    const backup = {};
    
    // Backup each model using Prisma client
    const models = [
      { name: 'incidents', model: prisma.incident },
      { name: 'affectedEntities', model: prisma.affectedEntity },
      { name: 'preliminaryAssessments', model: prisma.preliminaryAssessment },
      { name: 'rapidAssessments', model: prisma.rapidAssessment },
      { name: 'healthAssessments', model: prisma.healthAssessment },
      { name: 'populationAssessments', model: prisma.populationAssessment },
      { name: 'foodAssessments', model: prisma.foodAssessment },
      { name: 'washAssessments', model: prisma.washAssessment },
      { name: 'shelterAssessments', model: prisma.shelterAssessment },
      { name: 'securityAssessments', model: prisma.securityAssessment },
      { name: 'rapidResponses', model: prisma.rapidResponse },
      { name: 'donors', model: prisma.donor },
      { name: 'donorCommitments', model: prisma.donorCommitment },
      { name: 'donorAchievements', model: prisma.donorAchievement },
      { name: 'users', model: prisma.user },
      { name: 'roles', model: prisma.role },
      { name: 'accounts', model: prisma.account },
      { name: 'sessions', model: prisma.session },
      { name: 'permissions', model: prisma.permission },
      { name: 'rolePermissions', model: prisma.rolePermission },
      { name: 'notifications', model: prisma.notification },
      { name: 'auditLogs', model: prisma.auditLog },
      { name: 'userActivities', model: prisma.userActivity },
      { name: 'securityEvents', model: prisma.securityEvent },
      { name: 'systemMetrics', model: prisma.systemMetrics },
      { name: 'systemAlerts', model: prisma.systemAlert },
      { name: 'auditExports', model: prisma.auditExport },
      { name: 'achievementRules', model: prisma.achievementRule },
      { name: 'roleHistory', model: prisma.roleHistory },
      { name: 'bulkImports', model: prisma.bulkImport },
      { name: 'verificationTokens', model: prisma.verificationToken }
    ];
    
    for (const { name, model } of models) {
      try {
        const records = await model.findMany();
        backup[name] = records;
        console.log(`Backed up ${records.length} records from ${name}`);
      } catch (error) {
        console.log(`Skipped ${name}: ${error.message}`);
      }
    }
    
    // Save backup to file
    const backupPath = path.join(__dirname, 'database-backup.json');
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
    console.log(`Backup saved to ${backupPath}`);
    
    return backup;
  } catch (error) {
    console.error('Backup failed:', error);
    throw error;
  }
}

backupDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());