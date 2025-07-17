/**
 * Standalone script to clear all employee records from AsyncStorage
 * This can be run independently or imported into other parts of the app
 */

const clearEmployeeRecords = async () => {
  try {
    console.log('Starting to clear all employee records...');
    
    // Import AsyncStorage dynamically
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // 1. Clear employee user records (keep admin users)
    const usersData = await AsyncStorage.getItem('users');
    if (usersData) {
      const users = JSON.parse(usersData);
      const adminUsers = users.filter((user) => user.role === 'admin');
      await AsyncStorage.setItem('users', JSON.stringify(adminUsers));
      console.log(`Removed ${users.length - adminUsers.length} employee records from users`);
    }
    
    // 2. Clear all attendance records
    const allKeys = await AsyncStorage.getAllKeys();
    const attendanceKeys = allKeys.filter(key => key.startsWith('attendance_'));
    
    if (attendanceKeys.length > 0) {
      await AsyncStorage.multiRemove(attendanceKeys);
      console.log(`Removed ${attendanceKeys.length} attendance records`);
    }
    
    // 3. Clear employee locations
    await AsyncStorage.removeItem('employeeLocations');
    console.log('Removed employee location data');
    
    // 4. Clear attendance history
    await AsyncStorage.removeItem('attendanceHistory');
    console.log('Removed attendance history');
    
    console.log('Successfully cleared all employee records');
    
    // Get final summary
    const finalUsersData = await AsyncStorage.getItem('users');
    const finalUsers = finalUsersData ? JSON.parse(finalUsersData) : [];
    const finalKeys = await AsyncStorage.getAllKeys();
    const finalAttendanceKeys = finalKeys.filter(key => key.startsWith('attendance_'));
    
    console.log('\nFinal Storage Summary:');
    console.log(`- Total users: ${finalUsers.length}`);
    console.log(`- Admin users: ${finalUsers.filter(u => u.role === 'admin').length}`);
    console.log(`- Employee users: ${finalUsers.filter(u => u.role === 'employee').length}`);
    console.log(`- Attendance records: ${finalAttendanceKeys.length}`);
    
    return true;
    
  } catch (error) {
    console.error('Error clearing employee records:', error);
    return false;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearEmployeeRecords };
}

// If running directly, execute the function
if (typeof window === 'undefined') {
  clearEmployeeRecords().then(success => {
    if (success) {
      console.log('Employee records cleared successfully!');
    } else {
      console.log('Failed to clear employee records.');
    }
  });
} 