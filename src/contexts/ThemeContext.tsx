import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/theme';

// Define theme type
export type ThemeType = {
  primary: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  shadowColor: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  statusCheckedIn: string;
  statusCheckedOut: string;
  statusOutside: string;
  inputBackground: string;
};

// Define context type
type ThemeContextType = {
  theme: ThemeType;
  isDark: boolean;
  toggleTheme: () => void;
  setToLightTheme: () => void;
  setToDarkTheme: () => void;
};

// Create context
const ThemeContext = createContext<ThemeContextType | null>(null);

// Provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceTheme = useColorScheme();
  const [isDark, setIsDark] = useState<boolean>(deviceTheme === 'dark');

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeMode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          // If no saved preference, use device theme
          setIsDark(deviceTheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference', error);
      }
    };

    loadTheme();
  }, [deviceTheme]);

  // Toggle between light and dark theme
  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('themeMode', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  // Set to light theme
  const setToLightTheme = async () => {
    try {
      setIsDark(false);
      await AsyncStorage.setItem('themeMode', 'light');
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  // Set to dark theme
  const setToDarkTheme = async () => {
    try {
      setIsDark(true);
      await AsyncStorage.setItem('themeMode', 'dark');
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  // Current theme based on isDark state
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setToLightTheme, setToDarkTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 