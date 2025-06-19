import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GeofenceRegion } from '../types';

const LOCATION_TRACKING = 'location-tracking';

TaskManager.defineTask(LOCATION_TRACKING, async ({ data, error }) => {
  if (error) {
    console.error('Location tracking error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    // Handle location update
    console.log('Location update:', location);
  }
});

class LocationService {
  private static instance: LocationService;
  private geofences: Map<string, GeofenceRegion> = new Map();

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus === 'granted' && foregroundStatus === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startLocationTracking(onLocationUpdate: (location: Location.LocationObject) => void): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Location permissions not granted');
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TRACKING, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000, // 10 seconds
        distanceInterval: 10, // 10 meters
        foregroundService: {
          notificationTitle: 'OnSite Location Tracking',
          notificationBody: 'Tracking your location for attendance',
          notificationColor: '#007AFF',
        },
        
        activityType: Location.ActivityType.Fitness,
        showsBackgroundLocationIndicator: true,
      });

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        onLocationUpdate
      );

      return () => {
        locationSubscription.remove();
        Location.stopLocationUpdatesAsync(LOCATION_TRACKING);
      };
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async addGeofence(region: GeofenceRegion): Promise<void> {
    try {
      this.geofences.set(region.identifier, region);
      
    } catch (error) {
      console.error('Error adding geofence:', error);
      throw error;
    }
  }

  async removeGeofence(identifier: string): Promise<void> {
    try {
      this.geofences.delete(identifier);
    } catch (error) {
      console.error('Error removing geofence:', error);
      throw error;
    }
  }

  isInGeofence(location: Location.LocationObject, geofence: GeofenceRegion): boolean {
    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      geofence.latitude,
      geofence.longitude
    );
    return distance <= geofence.radius;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  async getCurrentLocation(): Promise<Location.LocationObject> {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }
}

export default LocationService.getInstance(); 