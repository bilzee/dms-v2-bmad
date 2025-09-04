#!/usr/bin/env node

import DatabaseService from '../lib/services/DatabaseService';

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Initialize default roles
    console.log('📝 Creating default roles...');
    await DatabaseService.initializeDefaultRoles();
    console.log('✅ Default roles created successfully');
    
    // Get database stats
    console.log('📊 Getting database stats...');
    const stats = await DatabaseService.getStats();
    console.log('Database initialized with:', stats);
    
    console.log('🎉 Database initialization complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();