import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/core';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../navigation/AppNavigator';

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

  // Define the geofence boundary for the office
  const geofence = user && user.assignedLocation ? {
    latitude: parseFloat(user.assignedLocation.latitude),
    longitude: parseFloat(user.assignedLocation.longitude),
    radius: parseFloat(user.assignedLocation.radius) || 100, // meters
    name: user.assignedLocation.name || 'Office'
  } : null;

  useEffect(() => {
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

      setLoading(false);
    };

    initializeScreen();
    // Only run this effect once on component mount
  }, []);

  // Function to check if the user is inside the geofence
  const updateLocationStatus = async (locationObj: Location.LocationObject) => {
    if (!geofence) {
      setLocationStatus('unknown');
      return;
    }

    const distance = calculateDistance(
      locationObj.coords.latitude,
      locationObj.coords.longitude,
      geofence.latitude,
      geofence.longitude
    );

    const isInside = distance <= (geofence.radius / 1000); // Convert radius to km
    setLocationStatus(isInside ? 'inside' : 'outside');

    // Save employee location to AsyncStorage for admin's map
    if (user && user.role === 'employee') {
      try {
        const locationsJSON = await AsyncStorage.getItem('employeeLocations');
        const locationsMap = locationsJSON ? JSON.parse(locationsJSON) : {};
        
        locationsMap[user.email] = {
          latitude: locationObj.coords.latitude,
          longitude: locationObj.coords.longitude,
          timestamp: new Date().toISOString(),
          isInside,
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
      const attendanceKey = `attendance_${user.email}_${new Date().toISOString().split('T')[0]}`;
      const attendanceData = await AsyncStorage.getItem(attendanceKey);
      
      if (attendanceData) {
        const data = JSON.parse(attendanceData);
        setAttendanceStatus(data.checkOutTime ? false : true);
      } else {
        setAttendanceStatus(false);
      }
    } catch (error) {
      console.error('Error getting attendance status:', error);
    }
  };

  // Handle check-in and check-out
  const handleAttendance = async () => {
    if (!user) return;
    
    // Only allow check-in/out if we have a geofence and are inside it
    if (!geofence) {
      Alert.alert('Error', 'You have no assigned location. Please contact your administrator.');
      return;
    }

    if (locationStatus !== 'inside') {
      Alert.alert('Error', 'You must be inside your assigned location to check in or out.');
      return;
    }
    
    setFetchingLocation(true);
    
    try {
      // Get the most current location
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      updateLocationStatus(currentLocation);
      
      // Check if the user is still inside the geofence with the new location
      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        geofence.latitude,
        geofence.longitude
      );
      
      const isInside = distance <= (geofence.radius / 1000);
      
      if (!isInside) {
        Alert.alert('Error', 'You must be inside your assigned location to check in or out.');
        setFetchingLocation(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const attendanceKey = `attendance_${user.email}_${today}`;
      const currentTime = new Date().toISOString();
      const formattedTime = new Date(currentTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const attendanceData = await AsyncStorage.getItem(attendanceKey);
      
      if (!attendanceData || attendanceStatus === false) {
        // Check in
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
        
        // Update the state immediately for better UX
        setAttendanceStatus(true);
        
        // Save to AsyncStorage
        await AsyncStorage.setItem(attendanceKey, JSON.stringify(checkInData));
        
        // Show success message with current time
        Alert.alert('Success', `You have successfully checked in at ${formattedTime}.`);
      } else {
        // Check out
        const storedData = JSON.parse(attendanceData);
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
        
        // Update the state immediately for better UX
        setAttendanceStatus(false);
        
        // Save to AsyncStorage
        await AsyncStorage.setItem(attendanceKey, JSON.stringify(updatedData));
        
        // Show success message with hours worked
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={isDark ? ['#2563eb', '#1e40af'] : ['#3B82F6', '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.header}
        >
          <Text style={styles.headerText}>Admin Dashboard</Text>
        </LinearGradient>

        <View style={[styles.mapContainer, { 
          shadowColor: theme.text,
          backgroundColor: theme.card
        }]}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
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
            {/* Render markers for each employee's last known location */}
            {mapReady && employeeLocations.map((emp, index) => (
              <Marker
                key={`emp-${index}`}
                coordinate={{
                  latitude: parseFloat(emp.latitude),
                  longitude: parseFloat(emp.longitude),
                }}
                title={emp.name || emp.email}
                description={`${emp.department || 'Unknown'} - ${emp.isInside ? 'Inside office' : 'Outside office'}`}
                onPress={() => setSelectedEmployee(emp)}
              >
                <View style={[
                  styles.personMarker,
                  { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)' }
                ]}>
                  <FontAwesome5 
                    name="user-alt" 
                    size={18} 
                    color={emp.isInside ? theme.statusCheckedIn : theme.statusCheckedOut} 
                  />
                </View>
                <Callout tooltip>
                  <View style={[styles.calloutView, { backgroundColor: theme.card }]}>
                    <Text style={[styles.calloutTitle, { color: theme.text }]}>{emp.name || emp.email}</Text>
                    <Text style={[styles.calloutSubtitle, { color: theme.textSecondary }]}>{emp.department || 'Unknown Department'}</Text>
                    <View style={styles.calloutStatusRow}>
                      <View style={[
                        styles.calloutStatusDot, 
                        { backgroundColor: emp.isInside ? theme.statusCheckedIn : theme.statusCheckedOut }
                      ]} />
                      <Text style={[styles.calloutStatus, { color: theme.text }]}>
                        {emp.isInside ? 'Inside office' : 'Outside office'}
                      </Text>
                    </View>
                  </View>
                </Callout>
              </Marker>
            ))}

            {/* Render circles for each employee's assigned location (office) */}
            {mapReady && employeeLocations.map((emp, index) => {
              if (emp.assignedLocation) {
                return (
                  <Circle
                    key={`circle-${index}`}
                    center={{
                      latitude: parseFloat(emp.assignedLocation.latitude),
                      longitude: parseFloat(emp.assignedLocation.longitude),
                    }}
                    radius={parseFloat(emp.assignedLocation.radius) || 100}
                    strokeWidth={1.5}
                    strokeColor={theme.primary}
                    fillColor={isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}
                  />
                );
              }
              return null;
            })}
          </MapView>
        </View>

        {/* Add Manage Geofences Button */}
        <TouchableOpacity 
          style={[
            styles.manageGeofencesButton,
            {
              backgroundColor: theme.primary,
              shadowColor: theme.text
            }
          ]}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.manageGeofencesButtonContent}>
            <Ionicons name="location-outline" size={20} color="#fff" />
            <Text style={styles.manageGeofencesButtonText}>Manage Geofences</Text>
          </View>
        </TouchableOpacity>

        {selectedEmployee && (
          <View style={[
            styles.employeeInfoCard,
            {
              backgroundColor: theme.card,
              shadowColor: theme.text
            }
          ]}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedEmployee(null)}
            >
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.empName, { color: theme.text }]}>{selectedEmployee.name}</Text>
            <Text style={[styles.empDepartment, { color: theme.textSecondary }]}>{selectedEmployee.department}</Text>
            <View style={styles.statusIndicatorRow}>
              <View style={[
                styles.statusIndicator, 
                { 
                  backgroundColor: selectedEmployee.isInside 
                    ? theme.statusCheckedIn 
                    : theme.statusCheckedOut 
                }
              ]} />
              <Text style={[styles.empStatus, { color: theme.text }]}>
                {selectedEmployee.isInside ? 'Inside assigned location' : 'Outside assigned location'}
              </Text>
            </View>
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
              Last updated: {new Date(selectedEmployee.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.refreshButton,
            { backgroundColor: theme.primary, shadowColor: theme.text }
          ]}
          onPress={refreshLocation}
          disabled={fetchingLocation}
        >
          {fetchingLocation ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="refresh" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Render employee view
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ['#2563eb', '#1e40af'] : ['#3B82F6', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerText}>Attendance Dashboard</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={[
          styles.scrollContentContainer,
          { backgroundColor: theme.background }
        ]}
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
        <View style={[
          styles.mapContainer, 
          { 
            shadowColor: theme.text,
            backgroundColor: theme.card
          }
        ]}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
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
            {/* Only render the geofence if it exists */}
            {mapReady && geofence && (
              <>
                <Marker
                  coordinate={{
                    latitude: geofence.latitude,
                    longitude: geofence.longitude,
                  }}
                  title={geofence.name}
                  description="Your assigned location"
                >
                  <View style={[
                    styles.officeMarker,
                    { 
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                      borderColor: theme.primary,
                      shadowColor: theme.text
                    }
                  ]}>
                    <MaterialIcons name="location-on" size={22} color={theme.primary} />
                  </View>
                  <Callout tooltip>
                    <View style={[styles.calloutView, { backgroundColor: theme.card }]}>
                      <Text style={[styles.calloutTitle, { color: theme.text }]}>{geofence.name}</Text>
                      <Text style={[styles.calloutSubtitle, { color: theme.textSecondary }]}>Your assigned location</Text>
                      <Text style={[styles.calloutRadius, { color: theme.text }]}>
                        Radius: {geofence.radius}m
                      </Text>
                    </View>
                  </Callout>
                </Marker>
                <Circle
                  center={{
                    latitude: geofence.latitude,
                    longitude: geofence.longitude,
                  }}
                  radius={geofence.radius}
                  strokeWidth={1.5}
                  strokeColor={theme.primary}
                  fillColor={isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)'}
                />
              </>
            )}
          </MapView>
        </View>

        {/* Move check-in/out button here - outside of the cards for more prominence */}
        {geofence && (
          <TouchableOpacity
            style={[
              styles.prominentAttendanceButton,
              attendanceStatus ? styles.checkOutButton : styles.checkInButton,
              fetchingLocation ? styles.disabledButton : {},
              locationStatus !== 'inside' ? styles.disabledButton : {},
              { shadowColor: theme.text }
            ]}
            onPress={handleAttendance}
            disabled={fetchingLocation || locationStatus !== 'inside'}
          >
            {fetchingLocation ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons 
                  name={attendanceStatus ? "log-out-outline" : "log-in-outline"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.prominentButtonText}>
                  {attendanceStatus ? 'CHECK OUT' : 'CHECK IN'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoCards}>
          <View style={[
            styles.card, 
            { 
              backgroundColor: theme.card,
              shadowColor: theme.text
            }
          ]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Your Location Status</Text>
            <View style={styles.locationStatusContainer}>
              <View 
                style={[
                  styles.statusIndicator, 
                  locationStatus === 'inside' ? { backgroundColor: theme.statusCheckedIn } : 
                  locationStatus === 'outside' ? { backgroundColor: theme.statusCheckedOut } : 
                  { backgroundColor: theme.statusOutside }
                ]} 
              />
              <Text style={[styles.locationStatusText, { color: theme.text }]}>
                {locationStatus === 'inside' ? 'Inside Office' : 
                 locationStatus === 'outside' ? 'Outside Office' : 
                 'Unknown Location'}
              </Text>
            </View>
            {geofence ? (
              <Text style={[styles.geofenceInfo, { color: theme.textSecondary }]}>
                Assigned to: {geofence.name}
              </Text>
            ) : (
              <Text style={[styles.geofenceWarning, { color: theme.error }]}>
                No location assigned. Contact your administrator.
              </Text>
            )}
          </View>

          <View style={[
            styles.card, 
            { 
              backgroundColor: theme.card,
              shadowColor: theme.text
            }
          ]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Your Attendance Status</Text>
            <View style={styles.attendanceStatusContainer}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: attendanceStatus ? theme.statusCheckedIn : theme.statusCheckedOut }
              ]} />
              <Text style={[styles.attendanceStatusText, { color: theme.text }]}>
                {attendanceStatus ? 'Checked In' : 'Checked Out'}
              </Text>
            </View>

            {/* Remove the button from here as we moved it up */}
            {!geofence && (
              <View style={[styles.noActionContainer, { backgroundColor: isDark ? '#2d3748' : '#eee' }]}>
                <Text style={[styles.noActionText, { color: theme.textSecondary }]}>
                  Attendance actions unavailable without assigned location
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
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
});

export default HomeScreen; 