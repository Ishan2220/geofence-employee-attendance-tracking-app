# Employee Records Clearing

This document explains how to clear employee records from the Onsite Attendance Tracking App.

## Overview

The app stores employee data in several places in AsyncStorage:

1. **User Records** (`'users'` key) - Contains all user accounts including employees
2. **Attendance Records** (keys starting with `'attendance_'`) - Daily attendance data
3. **Employee Locations** (`'employeeLocations'` key) - Real-time location tracking
4. **Attendance History** (`'attendanceHistory'` key) - Aggregated attendance data

## Methods to Clear Records

### 1. Through Admin Dashboard (Recommended)

1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. You'll see a "Storage Summary" section showing current data counts
4. Use the action buttons:
   - **"Clear Attendance"** - Removes only attendance records and location data (keeps employee accounts)
   - **"Clear All Employees"** - Removes all employee accounts and related data (keeps admin accounts)

### 2. Using Utility Functions

Import and use the utility functions in your code:

```javascript
import { 
  clearAllEmployeeRecords, 
  clearAttendanceRecords, 
  getStorageSummary 
} from './src/utils/storageUtils';

// Clear all employee records (keeps admin users)
await clearAllEmployeeRecords();

// Clear only attendance records (keeps employee accounts)
await clearAttendanceRecords();

// Get current storage summary
const summary = await getStorageSummary();
console.log(`Total users: ${summary.totalUsers}`);
console.log(`Employees: ${summary.employeeCount}`);
console.log(`Attendance records: ${summary.attendanceRecords}`);
```

### 3. Command Line Script

Run the command-line script:

```bash
# Clear all employee records
node clearRecords.js

# Clear only attendance records
node clearRecords.js --attendance-only
```

## What Gets Cleared

### `clearAllEmployeeRecords()` - Complete Employee Data Removal
- ✅ Removes all employee user accounts from `'users'` key
- ✅ Removes all attendance records (keys starting with `'attendance_'`)
- ✅ Removes employee location data from `'employeeLocations'`
- ✅ Removes attendance history from `'attendanceHistory'`
- ✅ Keeps admin user accounts intact

### `clearAttendanceRecords()` - Attendance Data Only
- ❌ Keeps all user accounts (employees and admins)
- ✅ Removes all attendance records (keys starting with `'attendance_'`)
- ✅ Removes employee location data from `'employeeLocations'`
- ✅ Removes attendance history from `'attendanceHistory'`

## Safety Features

- **Confirmation Dialogs**: Both admin dashboard buttons show confirmation dialogs before proceeding
- **Admin-Only Access**: Only admin users can access the clearing functions
- **Selective Clearing**: Choose between clearing all employee data or just attendance records
- **Data Preservation**: Admin accounts are always preserved
- **Error Handling**: Comprehensive error handling with user feedback

## Storage Summary

The admin dashboard shows a real-time storage summary:

- **Total Users**: Count of all user accounts
- **Employees**: Count of employee accounts only
- **Attendance Records**: Count of daily attendance records

## Recovery

⚠️ **Warning**: This action is irreversible. Once employee records are cleared, they cannot be recovered unless you have a backup.

To restore data, you would need to:
1. Re-register all employees
2. Re-enter any historical attendance data
3. Re-configure employee locations and geofences

## Default Admin Account

After clearing all employee records, the default admin account will still be available:
- **Email**: admin@onsite.com
- **Password**: admin123

## Troubleshooting

If you encounter issues:

1. **Check Console Logs**: All operations log detailed information to the console
2. **Verify Permissions**: Ensure you're logged in as an admin user
3. **Restart App**: Sometimes a restart is needed after clearing large amounts of data
4. **Check Storage**: Use the storage summary to verify the operation completed successfully

## API Reference

### `clearAllEmployeeRecords(): Promise<void>`
Clears all employee-related data while preserving admin accounts.

### `clearAttendanceRecords(): Promise<void>`
Clears only attendance and location data while preserving all user accounts.

### `getStorageSummary(): Promise<StorageSummary>`
Returns a summary of current storage usage.

```typescript
interface StorageSummary {
  totalUsers: number;
  employeeCount: number;
  adminCount: number;
  attendanceRecords: number;
  hasEmployeeLocations: boolean;
  hasAttendanceHistory: boolean;
}
``` 