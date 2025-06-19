// This file provides type declarations for modules that are having import issues

declare module '@react-native-async-storage/async-storage' {
  // Basic AsyncStorage interface
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    getAllKeys: () => Promise<string[]>;
    multiGet: (keys: string[]) => Promise<[string, string | null][]>;
    multiSet: (keyValuePairs: [string, string][]) => Promise<void>;
    multiRemove: (keys: string[]) => Promise<void>;
  };
  
  export default AsyncStorage;
}

declare module 'expo-linear-gradient' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';
  
  export interface LinearGradientProps extends ViewProps {
    colors: string[];
    start?: { x: number; y: number } | [number, number];
    end?: { x: number; y: number } | [number, number];
    locations?: number[];
  }
  
  export class LinearGradient extends Component<LinearGradientProps> {}
}

declare module '@react-navigation/native' {
  import { ComponentType } from 'react';
  
  // Basic useTheme hook
  export function useTheme(): any;
  
  // Basic useFocusEffect hook
  export function useFocusEffect(effect: () => (() => void) | void): void;
  
  // NavigationContainer component
  export const NavigationContainer: ComponentType<any>;
} 