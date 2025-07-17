import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Clears all employee records from AsyncStorage
 * This includes:
 * - Employee user records from 'users' key
 * - All attendance records (keys starting with 'attendance_')
 * - Employee location data from 'employeeLocations'
 * - Attendance history from 'attendanceHistory'
 */
export const clearAllEmployeeRecords = async (): Promise<void> => {
  try {
    console.log('Starting to clear all employee records...');
    
    // 1. Clear employee user records (keep admin users)
    const usersData = await AsyncStorage.getItem('users');
    if (usersData) {
      const users = JSON.parse(usersData);
      const adminUsers = users.filter((user: any) => user.role === 'admin');
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
    
    Alert.alert(
      'Success',
      'All employee records have been cleared from storage.',
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('Error clearing employee records:', error);
    Alert.alert(
      'Error',
      'Failed to clear employee records. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Clears only attendance records while keeping employee user data
 */
export const clearAttendanceRecords = async (): Promise<void> => {
  try {
    console.log('Starting to clear attendance records...');
    
    // Clear all attendance records
    const allKeys = await AsyncStorage.getAllKeys();
    const attendanceKeys = allKeys.filter(key => key.startsWith('attendance_'));
    
    if (attendanceKeys.length > 0) {
      await AsyncStorage.multiRemove(attendanceKeys);
      console.log(`Removed ${attendanceKeys.length} attendance records`);
    }
    
    // Clear attendance history
    await AsyncStorage.removeItem('attendanceHistory');
    console.log('Removed attendance history');
    
    // Clear employee locations
    await AsyncStorage.removeItem('employeeLocations');
    console.log('Removed employee location data');
    
    console.log('Successfully cleared attendance records');
    
    Alert.alert(
      'Success',
      'All attendance records have been cleared.',
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('Error clearing attendance records:', error);
    Alert.alert(
      'Error',
      'Failed to clear attendance records. Please try again.',
      [{ text: 'OK' }]
    );
    throw error;
  }
};

/**
 * Gets a summary of current storage usage
 */
export const getStorageSummary = async (): Promise<{
  totalUsers: number;
  employeeCount: number;
  adminCount: number;
  attendanceRecords: number;
  hasEmployeeLocations: boolean;
  hasAttendanceHistory: boolean;
}> => {
  try {
    // Get user counts
    const usersData = await AsyncStorage.getItem('users');
    const users = usersData ? JSON.parse(usersData) : [];
    const employees = users.filter((user: any) => user.role === 'employee');
    const admins = users.filter((user: any) => user.role === 'admin');
    
    // Get attendance record count
    const allKeys = await AsyncStorage.getAllKeys();
    const attendanceKeys = allKeys.filter(key => key.startsWith('attendance_'));
    
    // Check for other data
    const employeeLocations = await AsyncStorage.getItem('employeeLocations');
    const attendanceHistory = await AsyncStorage.getItem('attendanceHistory');
    
    return {
      totalUsers: users.length,
      employeeCount: employees.length,
      adminCount: admins.length,
      attendanceRecords: attendanceKeys.length,
      hasEmployeeLocations: !!employeeLocations,
      hasAttendanceHistory: !!attendanceHistory,
    };
  } catch (error) {
    console.error('Error getting storage summary:', error);
    throw error;
  }
}; 