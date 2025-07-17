export function isWithinGeofence(
  userLat: number,
  userLng: number,
  geofence: { latitude: string; longitude: string; radius: string }
): boolean {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const lat1 = toRad(userLat);
  const lat2 = toRad(Number(geofence.latitude));
  const deltaLat = toRad(Number(geofence.latitude) - userLat);
  const deltaLng = toRad(Number(geofence.longitude) - userLng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= Number(geofence.radius);
} 