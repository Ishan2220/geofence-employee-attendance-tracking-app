import { ThemeType } from '../contexts/ThemeContext';

export const lightTheme: ThemeType = {
  // Primary colors
  primary: '#3B82F6', // blue-500
  primaryLight: '#DBEAFE', // blue-100
  secondary: '#10B981', // emerald-500
  accent: '#F59E0B', // amber-500

  // UI colors
  background: '#F9FAFB', // gray-50
  card: '#FFFFFF', // white
  text: '#1F2937', // gray-800
  textSecondary: '#6B7280', // gray-500
  textTertiary: '#9CA3AF', // gray-400
  border: '#E5E7EB', // gray-200
  shadowColor: 'rgba(0, 0, 0, 0.1)',

  // Status colors
  error: '#EF4444', // red-500
  success: '#22C55E', // green-500
  warning: '#F59E0B', // amber-500
  info: '#3B82F6', // blue-500
  
  // App-specific status colors
  statusCheckedIn: '#22C55E', // green-500
  statusCheckedOut: '#EF4444', // red-500
  statusOutside: '#F59E0B', // amber-500
  
  // Input
  inputBackground: '#F3F4F6', // gray-100
};

export const darkTheme: ThemeType = {
  // Primary colors
  primary: '#3B82F6', // blue-500
  primaryLight: '#1E3A8A', // blue-900 with lower opacity
  secondary: '#10B981', // emerald-500
  accent: '#F59E0B', // amber-500

  // UI colors
  background: '#111827', // gray-900
  card: '#1F2937', // gray-800
  text: '#F9FAFB', // gray-50
  textSecondary: '#D1D5DB', // gray-300
  textTertiary: '#9CA3AF', // gray-400
  border: '#374151', // gray-700
  shadowColor: 'rgba(0, 0, 0, 0.3)',

  // Status colors
  error: '#EF4444', // red-500
  success: '#22C55E', // green-500
  warning: '#F59E0B', // amber-500
  info: '#3B82F6', // blue-500
  
  // App-specific status colors
  statusCheckedIn: '#22C55E', // green-500
  statusCheckedOut: '#EF4444', // red-500
  statusOutside: '#F59E0B', // amber-500
  
  // Input
  inputBackground: '#374151', // gray-700
}; 