import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isWithinGeofence } from '../../utils/geofenceUtils';
import { useNavigation } from '@react-navigation/core';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/AppNavigator';
import CustomMapMarker from '../../components/CustomMapMarker';
import { Text, Button, Card, Snackbar, ActivityIndicator, Avatar, FAB, Divider, useTheme as usePaperTheme } from 'react-native-paper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Custom map styles for light and dark mode
const mapStyleLight = [
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  }
];

const mapStyleDark = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      },
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuth();
  const { theme, isDark } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationStatus, setLocationStatus] = useState<'inside' | 'outside' | 'unknown'>('unknown');
  const [attendanceStatus, setAttendanceStatus] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [employeeLocations, setEmployeeLocations] = useState<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  
  // Admin specific state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [userGeofences, setUserGeofences] = useState<any[]>([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', error: false });
  const [checkinDebug, setCheckinDebug] = useState('');
  const [dailyAttendanceCompleted, setDailyAttendanceCompleted] = useState(false);

  // Define the geofence boundary for the office
  const geofence = user && user.assignedLocation ? {
    latitude: parseFloat(user.assignedLocation.latitude),
    longitude: parseFloat(user.assignedLocation.longitude),
    radius: parseFloat(user.assignedLocation.radius) || 100, // meters
    name: user.assignedLocation.name || 'Office'
  } : null;

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    const initializeScreen = async () => {
      setLoading(true);
      
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for attendance tracking.');
        setLoading(false);
        return;
      }

      try {
        // Get the current location
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);
        
        // Update location status (inside/outside geofence)
        updateLocationStatus(currentLocation);
        
        // Get the user's current attendance status from storage
        await getAttendanceStatus();
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Could not get your current location.');
      }

      // If the user is an admin, fetch all employees' locations
      if (user && user.role === 'admin') {
        try {
          console.log('Admin dashboard: Fetching employee data...');
          
          // First get all users to identify employees
          const usersJSON = await AsyncStorage.getItem('users');
          if (usersJSON) {
            const users = JSON.parse(usersJSON);
            const employees = users.filter((u: any) => u.role === 'employee');
            console.log(`Found ${employees.length} employees in the system`);
            
            // Get employee locations from AsyncStorage
            const employeeLocationsJSON = await AsyncStorage.getItem('employeeLocations');
            
            // Initialize an empty locations map if none exists
            const locationsMap = employeeLocationsJSON ? JSON.parse(employeeLocationsJSON) : {};
            console.log(`Found locations for ${Object.keys(locationsMap).length} employees`);
            
            // If we have employee data but no location data yet, create placeholder data
            if (employees.length > 0) {
              // Create enriched location data that combines user info with location data
              const enrichedLocations = employees.map(employee => {
                const locationData = locationsMap[employee.email] || null;
                
                // Define a proper type for enrichedLocation that includes the assignedLocation field
                type EnrichedLocation = {
                  email: string;
                  name: string;
                  department: string;
                  latitude: number;
                  longitude: number;
                  timestamp: string;
                  isInside: boolean;
                  assignedLocation?: {
                    latitude: number;
                    longitude: number;
                    radius: number;
                    name: string;
                  };
                };
                
                // If we have location data for this employee, use it
                if (locationData) {
                  let enrichedLocation: EnrichedLocation = {
                    email: employee.email,
                    name: employee.name || employee.email,
                    department: employee.department || 'Unknown',
                    latitude: parseFloat(locationData.latitude),
                    longitude: parseFloat(locationData.longitude),
                    timestamp: locationData.timestamp,
                    isInside: locationData.isInside,
                  };
                  
                  if (employee.assignedLocation) {
                    enrichedLocation.assignedLocation = {
                      latitude: parseFloat(employee.assignedLocation.latitude),
                      longitude: parseFloat(employee.assignedLocation.longitude),
                      radius: parseFloat(employee.assignedLocation.radius) || 100,
                      name: employee.assignedLocation.name || 'Office'
                    };
                  }
                  
                  return enrichedLocation;
                } else {
                  // If no location data exists yet, use default values
                  // This ensures employees appear in the list even if they haven't checked in
                  let enrichedLocation: EnrichedLocation = {
                    email: employee.email,
                    name: employee.name || employee.email,
                    department: employee.department || 'Unknown',
                    // Default coordinates (will be updated when they check in)
                    latitude: 37.78825,
                    longitude: -122.4324,
                    timestamp: new Date().toISOString(),
                    isInside: false,
                  };
                  
                  if (employee.assignedLocation) {
                    enrichedLocation.assignedLocation = {
                      latitude: parseFloat(employee.assignedLocation.latitude),
                      longitude: parseFloat(employee.assignedLocation.longitude),
                      radius: parseFloat(employee.assignedLocation.radius) || 100,
                      name: employee.assignedLocation.name || 'Office'
                    };
                  }
                  
                  return enrichedLocation;
                }
              });
              
              console.log(`Created ${enrichedLocations.length} employee markers for the map`);
              // Update the state with enriched location data
              setEmployeeLocations(enrichedLocations);
            } else {
              // Set empty array if no employees found
              console.log('No employees found in the system');
              setEmployeeLocations([]);
            }
          }
        } catch (error) {
          console.error('Error fetching employee locations:', error);
          // Set empty array on error
          setEmployeeLocations([]);
        }
      }

      // Load geofences for employee
      if (user && user.role === 'employee') {
        try {
          const geofenceData = await AsyncStorage.getItem('geofences_' + user.id);
          setUserGeofences(geofenceData ? JSON.parse(geofenceData) : []);
        } catch (e) {
          setUserGeofences([]);
        }
        // Start watching location
        locationSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          async (loc) => {
            setLocation(loc);
            // Check if inside any geofence
            const insideAny = (userGeofences || []).some(geo =>
              isWithinGeofence(
                loc.coords.latitude,
                loc.coords.longitude,
                geo
              )
            );
            setLocationStatus(insideAny ? 'inside' : 'outside');
            // If checked in and now outside all geofences, auto check-out
            if (attendanceStatus && !insideAny) {
              // Auto check-out logic
              try {
                const today = new Date().toISOString().split('T')[0];
                const attendanceKey = `attendance_${user.email}_${today}`;
                const attendanceData = await AsyncStorage.getItem(attendanceKey);
                if (attendanceData) {
                  const storedData = JSON.parse(attendanceData);
                  const currentTime = new Date().toISOString();
                  const totalHours = calculateHours(storedData.checkInTime, currentTime);
                  const updatedData = {
                    ...storedData,
                    checkOutTime: currentTime,
                    checkOutLocation: {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    },
                    totalHours,
                  };
                  await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedData));
                  setAttendanceStatus(false);
                  setDailyAttendanceCompleted(true); // Mark as completed on auto check-out
                  setSnackbar({ visible: true, message: 'You have been automatically checked out for leaving the geofence.', error: false });
                }
              } catch (e) {
                setSnackbar({ visible: true, message: 'Auto check-out failed.', error: true });
              }
            }
          }
        );
      }
      setLoading(false);
    };
    initializeScreen();
    // Cleanup watcher on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Function to check if the user is inside any geofence (for updateLocationStatus)
  const updateLocationStatus = async (locationObj: Location.LocationObject) => {
    if (!userGeofences.length) {
      setLocationStatus('unknown');
      return;
    }
    const insideAny = userGeofences.some(geo =>
      isWithinGeofence(
        locationObj.coords.latitude,
        locationObj.coords.longitude,
        geo
      )
    );
    setLocationStatus(insideAny ? 'inside' : 'outside');
    // Save employee location to AsyncStorage for admin's map
    if (user && user.role === 'employee') {
      try {
        const locationsJSON = await AsyncStorage.getItem('employeeLocations');
        const locationsMap = locationsJSON ? JSON.parse(locationsJSON) : {};
        locationsMap[user.email] = {
          latitude: locationObj.coords.latitude,
          longitude: locationObj.coords.longitude,
          timestamp: new Date().toISOString(),
          isInside: insideAny,
        };
        await AsyncStorage.setItem('employeeLocations', JSON.stringify(locationsMap));
      } catch (error) {
        console.error('Error saving employee location:', error);
      }
    }
  };

  // Calculate distance between two coordinates in km (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Get the user's attendance status from AsyncStorage
  const getAttendanceStatus = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const attendanceKey = `attendance_${user.email}_${today}`;
      const attendanceData = await AsyncStorage.getItem(attendanceKey);
      
      if (attendanceData) {
        const data = JSON.parse(attendanceData);
        // Check if they have checked in today (regardless of checkout status)
        if (data.checkInTime) {
          setAttendanceStatus(true);
          // Check if they have also checked out today
          if (data.checkOutTime) {
            setDailyAttendanceCompleted(true);
          } else {
            setDailyAttendanceCompleted(false);
          }
        } else {
          setAttendanceStatus(false);
          setDailyAttendanceCompleted(false);
        }
      } else {
        setAttendanceStatus(false);
        setDailyAttendanceCompleted(false);
      }
    } catch (error) {
      console.error('Error getting attendance status:', error);
      setAttendanceStatus(false);
      setDailyAttendanceCompleted(false);
    }
  };

  // Handle check-in and check-out
  const handleAttendance = async () => {
    if (!user) return;
    
    // Check if already checked in today
    const today = new Date().toISOString().split('T')[0];
    const attendanceKey = `attendance_${user.email}_${today}`;
    const existingAttendanceData = await AsyncStorage.getItem(attendanceKey);
    
    if (existingAttendanceData) {
      const existingData = JSON.parse(existingAttendanceData);
      if (existingData.checkInTime && !existingData.checkOutTime) {
        // Already checked in today and not checked out - allow checkout
        // This is the checkout flow
      } else if (existingData.checkInTime && existingData.checkOutTime) {
        // Already checked in and out today - prevent multiple check-ins
        Alert.alert(
          'Already Checked In Today', 
          'You have already checked in and out today. You can only check in once per day.'
        );
        return;
      }
    }
    
    // Load all geofences for this user
    let userGeofences = [];
    try {
      const geofenceData = await AsyncStorage.getItem('geofences_' + user.id);
      userGeofences = geofenceData ? JSON.parse(geofenceData) : [];
    } catch (e) {
      userGeofences = [];
    }
    if (!userGeofences.length) {
      Alert.alert('Error', 'You have no assigned geofences. Please contact your administrator.');
      return;
    }
    // Get the most current location
    setFetchingLocation(true);
    let currentLocation;
    try {
      currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    } catch (e) {
      setFetchingLocation(false);
      Alert.alert('Error', 'Could not get your current location.');
      return;
    }
    // Check if inside any geofence (meters)
    const insideAny = userGeofences.some(geo =>
      isWithinGeofence(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        geo
      )
    );
    if (!insideAny) {
      // Debug output
      const debugInfo = userGeofences.map((geo, idx) => {
        const lat = parseFloat(geo.latitude);
        const lng = parseFloat(geo.longitude);
        const rad = parseFloat(geo.radius);
        const userLat = currentLocation.coords.latitude;
        const userLng = currentLocation.coords.longitude;
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371000;
        const lat1 = toRad(userLat);
        const lat2 = toRad(lat);
        const deltaLat = toRad(lat - userLat);
        const deltaLng = toRad(lng - userLng);
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return `Geofence ${idx + 1}: Center=(${lat},${lng}), Radius=${rad}m, Your Location=(${userLat},${userLng}), Distance=${distance.toFixed(2)}m`;
      }).join('\n');
      Alert.alert('Error', `You must be within your assigned geofence to check in or out.\n\nDebug Info:\n${debugInfo}`);
      setFetchingLocation(false);
      return;
    }
    try {
      // Update location status (optional)
      updateLocationStatus(currentLocation);
      // Proceed with check-in/out logic
      const currentTime = new Date().toISOString();
      const formattedTime = new Date(currentTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const attendanceData = await AsyncStorage.getItem(attendanceKey);
      
      if (!attendanceData) {
        // First check-in of the day
        const checkInData = {
          date: today,
          email: user.email,
          name: user.name,
          department: user.department,
          checkInTime: currentTime,
          checkInLocation: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
        };
        setAttendanceStatus(true);
        await AsyncStorage.setItem(attendanceKey, JSON.stringify(checkInData));
        Alert.alert('Success', `You have successfully checked in at ${formattedTime}.`);
      } else {
        // Check out (already checked in today)
        const storedData = JSON.parse(attendanceData);
        if (storedData.checkOutTime) {
          Alert.alert(
            'Already Checked Out', 
            'You have already checked in and out today. You can only check in once per day.'
          );
          return;
        }
        const totalHours = calculateHours(storedData.checkInTime, currentTime);
        const updatedData = {
          ...storedData,
          checkOutTime: currentTime,
          checkOutLocation: {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          },
          totalHours,
        };
        setAttendanceStatus(false);
        await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedData));
        setDailyAttendanceCompleted(true);
        Alert.alert(
          'Success', 
          `You have successfully checked out at ${formattedTime}.\nTotal hours worked: ${totalHours} hours`
        );
      }
    } catch (error) {
      console.error('Error handling attendance:', error);
      Alert.alert('Error', 'Failed to process your attendance.');
    }
    setFetchingLocation(false);
  };

  // Manual checkout function (doesn't require geofence check)
  const handleManualCheckout = async () => {
    if (!user) return;
    
    Alert.alert(
      'Manual Checkout',
      'Are you sure you want to check out manually? This will record your current location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            setFetchingLocation(true);
            try {
              let currentLocation;
              try {
                currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              } catch (e) {
                // If location is not available, use a default location or proceed without location
                currentLocation = null;
              }
              
              const today = new Date().toISOString().split('T')[0];
              const attendanceKey = `attendance_${user.email}_${today}`;
              const currentTime = new Date().toISOString();
              const formattedTime = new Date(currentTime).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              
              const attendanceData = await AsyncStorage.getItem(attendanceKey);
              if (attendanceData) {
                const storedData = JSON.parse(attendanceData);
                const totalHours = calculateHours(storedData.checkInTime, currentTime);
                const updatedData = {
                  ...storedData,
                  checkOutTime: currentTime,
                  checkOutLocation: currentLocation ? {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                  } : null,
                  totalHours,
                  manualCheckout: true,
                };
                setAttendanceStatus(false);
                await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedData));
                setDailyAttendanceCompleted(true);
                Alert.alert(
                  'Manual Checkout Complete', 
                  `You have been checked out at ${formattedTime}.\nTotal hours worked: ${totalHours} hours\n\nNote: This was a manual checkout.`
                );
              } else {
                Alert.alert('Error', 'No check-in record found for today.');
              }
            } catch (error) {
              console.error('Error during manual checkout:', error);
              Alert.alert('Error', 'Failed to process manual checkout.');
            }
            setFetchingLocation(false);
          }
        }
      ]
    );
  };

  // Auto checkout when location is disabled
  const handleLocationPermissionChange = async () => {
    if (!user || !attendanceStatus) return;
    
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Location permission was revoked, auto checkout
        const today = new Date().toISOString().split('T')[0];
        const attendanceKey = `attendance_${user.email}_${today}`;
        const currentTime = new Date().toISOString();
        const formattedTime = new Date(currentTime).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const attendanceData = await AsyncStorage.getItem(attendanceKey);
        if (attendanceData) {
          const storedData = JSON.parse(attendanceData);
          const totalHours = calculateHours(storedData.checkInTime, currentTime);
          const updatedData = {
            ...storedData,
            checkOutTime: currentTime,
            checkOutLocation: null,
            totalHours,
            autoCheckout: true,
            autoCheckoutReason: 'Location permission revoked',
          };
          setAttendanceStatus(false);
          await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedData));
          setDailyAttendanceCompleted(true);
          
          setSnackbar({
            visible: true,
            message: `Auto checkout at ${formattedTime} - Location disabled`,
            error: false
          });
        }
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  // Monitor location permission changes
  useEffect(() => {
    let permissionCheckInterval: NodeJS.Timeout;
    
    if (attendanceStatus) {
      // Check location permission every 30 seconds when checked in
      permissionCheckInterval = setInterval(handleLocationPermissionChange, 30000);
    }
    
    return () => {
      if (permissionCheckInterval) {
        clearInterval(permissionCheckInterval);
      }
    };
  }, [attendanceStatus, user]);

  const calculateHours = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    const diffHrs = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHrs.toFixed(2));
  };

  // Function to refresh the current location
  const refreshLocation = async () => {
    setFetchingLocation(true);
    try {
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(currentLocation);
      updateLocationStatus(currentLocation);
    } catch (error) {
      console.error('Error refreshing location:', error);
      Alert.alert('Error', 'Could not update your location.');
    }
    setFetchingLocation(false);
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Get initial map region based on user type
  const getInitialRegion = () => {
    if (user?.role === 'admin') {
      // For admin, center on first employee or a default location
      if (employeeLocations.length > 0) {
        return {
          latitude: parseFloat(employeeLocations[0].latitude) || 37.78825,
          longitude: parseFloat(employeeLocations[0].longitude) || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
      } else {
        // Default to a city center or your office location
        return {
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
      }
    } else {
      // For employee, center on their location or their assigned office
      if (location) {
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
      } else if (geofence) {
        return {
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
      } else {
        // Default fallback
        return {
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
      }
    }
  };

  // Render admin view
  if (user?.role === 'admin') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Dashboard Header Card */}
        <Card style={{ borderRadius: 24, margin: 16, marginBottom: 0, elevation: 6, overflow: 'hidden', backgroundColor: theme.primary }}>
          <LinearGradient
            colors={isDark ? ['#2563eb', '#1e40af'] : ['#3B82F6', '#1d4ed8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 24 }}
          >
            <Avatar.Icon icon="view-dashboard-outline" size={48} style={{ backgroundColor: theme.card, marginRight: 18 }} color={theme.primary} />
            <View>
              <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 22, marginBottom: 2 }}>Admin Dashboard</Text>
              <Text style={{ color: '#fff', opacity: 0.85, fontSize: 15 }}>Welcome back! Here’s your overview.</Text>
            </View>
          </LinearGradient>
        </Card>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={fetchingLocation}
              onRefresh={refreshLocation}
              colors={[theme.primary]}
              tintColor={theme.primary}
              progressBackgroundColor={theme.card}
            />
          }
        >
          {/* Map Card - show employees only */}
          <Card style={{ borderRadius: 18, marginBottom: 18, overflow: 'hidden', elevation: 4 }}>
            <View style={{ height: 400, width: '100%' }}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                initialRegion={getInitialRegion()}
                customMapStyle={isDark ? mapStyleDark : mapStyleLight}
                onMapReady={() => setMapReady(true)}
                loadingEnabled={true}
                loadingIndicatorColor={theme.primary}
                loadingBackgroundColor={theme.background}
              >
                {/* Optionally show employee markers here */}
                {mapReady && employeeLocations.map((emp, idx) => (
                  <Marker
                    key={emp.email}
                    coordinate={{ latitude: emp.latitude, longitude: emp.longitude }}
                    title={emp.name}
                    description={emp.department}
                  >
                    <View style={{ backgroundColor: theme.primary, borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={16} color={theme.card} />
                    </View>
                  </Marker>
                ))}
              </MapView>
            </View>
          </Card>
          {/* You can add more admin-specific cards or stats here if needed */}
        </ScrollView>
        {/* Floating refresh FAB */}
        <FAB
          icon="refresh"
          onPress={refreshLocation}
          loading={fetchingLocation}
          style={styles.fab}
          color={theme.card}
          accessibilityLabel="Refresh Location"
        />
      </View>
    );
  }

  // Render employee view
  if (user?.role !== 'admin') {
    const insideAnyGeofence = (userGeofences || []).some(geo =>
      location && isWithinGeofence(
        location.coords.latitude,
        location.coords.longitude,
        geo
      )
    );
    // Debug reason for check-in button state
    let checkinReason = '';
    if (!userGeofences.length) checkinReason = 'No geofence assigned.';
    else if (!location) checkinReason = 'Location not available.';
    else if (attendanceStatus) checkinReason = 'Already checked in.';
    else if (dailyAttendanceCompleted) checkinReason = 'Daily attendance completed.';
    else if (!insideAnyGeofence) checkinReason = 'Not inside any geofence.';
    else checkinReason = '';

    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Gradient Header */}
        <LinearGradient
          colors={[theme.primary, theme.primaryLight]}
          style={{ paddingTop: 70, paddingBottom: 36, alignItems: 'center', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 8 }}
        >
          <Avatar.Icon size={64} icon="map-marker-radius" color={theme.card} style={{ backgroundColor: theme.primary, marginBottom: 10 }} />
          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 24, marginBottom: 2 }}>Welcome, {user?.name}</Text>
          <Text style={{ color: theme.textSecondary, opacity: 0.8, marginBottom: 2 }}>{user?.email}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 18 }}>
          {/* Map Card */}
          <Card style={{ borderRadius: 18, marginBottom: 18, overflow: 'hidden', elevation: 4 }}>
            <View style={{ height: 220, width: '100%' }}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                initialRegion={getInitialRegion()}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                customMapStyle={isDark ? mapStyleDark : mapStyleLight}
                onMapReady={() => setMapReady(true)}
                loadingEnabled={true}
                loadingIndicatorColor={theme.primary}
                loadingBackgroundColor={theme.background}
              >
                {mapReady && userGeofences && userGeofences.map((geo, idx) => (
                  <Circle
                    key={idx}
                    center={{
                      latitude: parseFloat(geo.latitude),
                      longitude: parseFloat(geo.longitude),
                    }}
                    radius={parseFloat(geo.radius)}
                    strokeWidth={2}
                    strokeColor={theme.primary}
                    fillColor={isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}
                  />
                ))}
              </MapView>
            </View>
          </Card>
          {/* Geofence Info Card */}
          <Card style={{ borderRadius: 16, marginBottom: 16, padding: 18, elevation: 3 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, color: theme.primary, marginBottom: 6 }}>Assigned Geofences</Text>
            {userGeofences.length === 0 ? (
              <Text style={{ color: theme.error }}>No geofence assigned. Contact your administrator.</Text>
            ) : (
              userGeofences.map((geo, idx) => (
                <Text key={idx} style={{ color: theme.text, marginBottom: 2 }}>
                  • Lat: {geo.latitude}, Lng: {geo.longitude}, Radius: {geo.radius}m
                </Text>
              ))
            )}
          </Card>
          {/* Location Status Card */}
          <Card style={{ borderRadius: 16, marginBottom: 16, padding: 18, elevation: 3 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, color: theme.primary, marginBottom: 6 }}>Your Location Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, marginRight: 10, backgroundColor: locationStatus === 'inside' ? theme.success : locationStatus === 'outside' ? theme.error : theme.statusOutside }} />
              <Text style={{ color: theme.text, fontSize: 16 }}>
                {locationStatus === 'inside' ? 'Inside Geofence' : locationStatus === 'outside' ? 'Outside Geofence' : 'Unknown Location'}
              </Text>
            </View>
          </Card>
          {/* Attendance Status Card */}
          <Card style={{ borderRadius: 16, marginBottom: 16, padding: 18, elevation: 3 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 17, color: theme.primary, marginBottom: 6 }}>Your Attendance Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, marginRight: 10, backgroundColor: attendanceStatus ? theme.success : theme.error }} />
              <Text style={{ color: theme.text, fontSize: 16 }}>
                {attendanceStatus ? 'Checked In' : 'Checked Out'}
              </Text>
            </View>
          </Card>
          {/* Check-in button only if inside geofence and not checked in and not completed today */}
          {insideAnyGeofence && !attendanceStatus && !dailyAttendanceCompleted && (
            <Button
              mode="contained"
              onPress={handleAttendance}
              disabled={fetchingLocation}
              style={{ marginHorizontal: 30, marginTop: 8, marginBottom: 32, borderRadius: 30, alignSelf: 'center', minWidth: 240, elevation: 4 }}
              labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
              contentStyle={{ paddingVertical: 18 }}
            >
              <Ionicons name="log-in-outline" size={26} color={theme.card} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.card, letterSpacing: 1 }}>
                CHECK IN
              </Text>
            </Button>
          )}
          {/* Manual checkout button when checked in */}
          {attendanceStatus && !dailyAttendanceCompleted && (
            <View style={{ marginHorizontal: 30, marginTop: 8, marginBottom: 32 }}>
              <Button
                mode="contained"
                onPress={handleManualCheckout}
                disabled={fetchingLocation}
                style={{ borderRadius: 30, alignSelf: 'center', minWidth: 240, elevation: 4, backgroundColor: theme.error }}
                labelStyle={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}
                contentStyle={{ paddingVertical: 18 }}
              >
                <Ionicons name="log-out-outline" size={26} color={theme.card} style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.card, letterSpacing: 1 }}>
                  MANUAL CHECKOUT
                </Text>
              </Button>
              <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 12 }}>
                Use this if you need to check out outside your geofence
              </Text>
            </View>
          )}
          {/* Daily completion message */}
          {dailyAttendanceCompleted && (
            <Card style={{ borderRadius: 16, marginHorizontal: 30, marginTop: 8, marginBottom: 32, padding: 18, elevation: 3, backgroundColor: theme.success + '20' }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={48} color={theme.success} style={{ marginBottom: 12 }} />
                <Text style={{ color: theme.success, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
                  Daily Attendance Complete
                </Text>
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 14 }}>
                  You have completed your check-in and check-out for today.
                </Text>
              </View>
            </Card>
          )}
          {/* Show debug reason if check-in button is not available */}
          {!insideAnyGeofence || attendanceStatus || dailyAttendanceCompleted || !userGeofences.length || !location ? (
            <Text style={{ color: theme.error, textAlign: 'center', marginBottom: 16, marginTop: -16 }}>
              {checkinReason}
            </Text>
          ) : null}
        </ScrollView>
        {/* Floating refresh FAB */}
        <FAB
          icon="refresh"
          onPress={refreshLocation}
          loading={fetchingLocation}
          style={{ position: 'absolute', bottom: 30, right: 30, backgroundColor: theme.primary, elevation: 6 }}
          color={theme.card}
          accessibilityLabel="Refresh Location"
        />
        {/* Snackbar for auto check-out or errors */}
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={3000}
          style={{ backgroundColor: snackbar.error ? theme.error : theme.primary }}
        >
          {snackbar.message}
        </Snackbar>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  mapContainer: {
    height: 320,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  officeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  calloutView: {
    width: 200,
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  calloutStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  calloutStatus: {
    fontSize: 14,
  },
  calloutRadius: {
    fontSize: 14,
    marginTop: 4,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    maxHeight: 250,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 14,
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationStatusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  geofenceInfo: {
    fontSize: 14,
    marginTop: 8,
  },
  geofenceWarning: {
    fontSize: 14,
    marginTop: 8,
  },
  attendanceStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceStatusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  attendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    minHeight: 55,
    marginTop: 10,
    width: '100%',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, 
    shadowRadius: 2,
    elevation: 3,
  },
  checkInButton: {
    backgroundColor: '#22c55e', // Success green
  },
  checkOutButton: {
    backgroundColor: '#ef4444', // Error red
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  attendanceButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  noActionContainer: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  noActionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  employeeInfoCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
  },
  empName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  empDepartment: {
    fontSize: 14,
    marginBottom: 12,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  empStatus: {
    fontSize: 15,
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 8,
  },
  personMarker: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  manageGeofencesButton: {
    position: 'absolute',
    top: 84,
    right: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  manageGeofencesButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manageGeofencesButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  prominentAttendanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 30,
    marginTop: -20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    minHeight: 60,
  },
  prominentButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  infoCards: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#2563eb',
    elevation: 6,
  },
});

export default HomeScreen; 