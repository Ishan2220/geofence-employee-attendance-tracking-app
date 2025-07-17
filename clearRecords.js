#!/usr/bin/env node

/**
 * Command-line script to clear employee records from AsyncStorage
 * Usage: node clearRecords.js [--attendance-only]
 */

const { clearAllEmployeeRecords, clearAttendanceRecords, getStorageSummary } = require('./src/utils/storageUtils');

async function main() {
  const args = process.argv.slice(2);
  const attendanceOnly = args.includes('--attendance-only');
  
  try {
    console.log('🔍 Getting current storage summary...');
    const summary = await getStorageSummary();
    
    console.log('\n📊 Current Storage Summary:');
    console.log(`- Total Users: ${summary.totalUsers}`);
    console.log(`- Employees: ${summary.employeeCount}`);
    console.log(`- Admins: ${summary.adminCount}`);
    console.log(`- Attendance Records: ${summary.attendanceRecords}`);
    console.log(`- Has Employee Locations: ${summary.hasEmployeeLocations ? 'Yes' : 'No'}`);
    console.log(`- Has Attendance History: ${summary.hasAttendanceHistory ? 'Yes' : 'No'}`);
    
    if (attendanceOnly) {
      console.log('\n🗑️  Clearing attendance records only...');
      await clearAttendanceRecords();
      console.log('✅ Attendance records cleared successfully!');
    } else {
      console.log('\n🗑️  Clearing all employee records...');
      await clearAllEmployeeRecords();
      console.log('✅ All employee records cleared successfully!');
    }
    
    console.log('\n📊 Final Storage Summary:');
    const finalSummary = await getStorageSummary();
    console.log(`- Total Users: ${finalSummary.totalUsers}`);
    console.log(`- Employees: ${finalSummary.employeeCount}`);
    console.log(`- Admins: ${finalSummary.adminCount}`);
    console.log(`- Attendance Records: ${finalSummary.attendanceRecords}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
} 