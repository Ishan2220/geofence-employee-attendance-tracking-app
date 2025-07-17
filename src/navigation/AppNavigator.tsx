import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Text, View, ActivityIndicator } from 'react-native';

// Import screens (we'll create these next)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/main/HomeScreen';
import AttendanceScreen from '../screens/main/AttendanceScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageGeofencesScreen from '../screens/admin/ManageGeofencesScreen';
import ManageAdminRequestsScreen from '../screens/admin/ManageAdminRequestsScreen';

// Define types for our navigation stacks
export type RootStackParamList = {
  MainApp: undefined;
  Login: undefined;
  Register: undefined;
  AdminDashboard: undefined;
  ManageGeofences: undefined;
  ManageAdminRequests: undefined;
};

export type TabStackParamList = {
  Home: undefined;
  Attendance: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabStackParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'alert';
          }
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();
  
  useEffect(() => {
    console.log('AppNavigator: Auth state changed', { 
      isAuthenticated: !!user, 
      loading,
      user: user ? { id: user.id, email: user.email } : 'Not logged in'
    });
  }, [user, loading]);

  // Show loading indicator while authentication state is being determined
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }
  
  // Create a single navigator with conditional rendering of screens
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // Authenticated screens
        <>
          <Stack.Screen name="MainApp" component={MainTabs} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          <Stack.Screen name="ManageGeofences" component={ManageGeofencesScreen} />
          <Stack.Screen name="ManageAdminRequests" component={ManageAdminRequestsScreen} />
        </>
      ) : (
        // Unauthenticated screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator; 