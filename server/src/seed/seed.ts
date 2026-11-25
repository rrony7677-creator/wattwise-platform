import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';

async function runCliSeed(): Promise<void> {
  console.log('🌱 Connecting to MongoDB and seeding WattWise dataset...');
  const startTime = Date.now();

  try {
    await connectDB();
    const summary = await seedDatabase({ force: true });
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ WattWise Dataset Seeding Complete!');
    console.log('-------------------------------------------');
    console.log(`🏢 Organizations    : ${summary.organizations} (Min required: 3)`);
    console.log(`🏗️  Buildings        : ${summary.buildings} (Min required: 10)`);
    console.log(`🪜 Floors           : ${summary.floors} (Min required: 30)`);
    console.log(`🏛️  Departments      : ${summary.departments} (Min required: 50)`);
    console.log(`⚡ Smart Meters     : ${summary.meters}`);
    console.log(`👥 Role Users       : ${summary.users} (Default password: Password123!)`);
    console.log(`📈 Energy Records   : ${summary.energyRecords} (Min required: 5,000+)`);
    console.log(`🎯 Thresholds       : ${summary.thresholds}`);
    console.log(`🚨 Alerts           : ${summary.alerts}`);
    console.log(`📅 Scheduled Reports: ${summary.scheduledReports}`);
    console.log(`⏱️  Elapsed Time     : ${elapsedSec}s`);
    console.log('-------------------------------------------\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

void runCliSeed();
