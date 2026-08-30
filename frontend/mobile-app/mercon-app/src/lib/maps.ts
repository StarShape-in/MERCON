import { Linking, Platform } from 'react-native';

export interface MapStopInput {
  location_lat?: number | null;
  location_lng?: number | null;
  location_name?: string | null;
  location_address?: string | null;
  location?: { id?: string; name?: string; address?: string | null } | null;
  address?: string | null;
}

/**
 * Opens the target location/stop in external maps app (Google Maps on Android/Web, Apple Maps / Google Maps on iOS).
 */
export function openInGoogleMaps(stop?: MapStopInput | null): void {
  if (!stop) return;

  const lat = stop.location_lat;
  const lng = stop.location_lng;
  const label = stop.location_name || stop.location?.name || stop.location_address || stop.address || 'Destination';

  if (lat != null && lng != null && (lat !== 0 || lng !== 0)) {
    const scheme = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });

    const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.canOpenURL(scheme)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme);
        } else {
          Linking.openURL(webFallback);
        }
      })
      .catch(() => {
        Linking.openURL(webFallback);
      });
  } else if (label) {
    const query = encodeURIComponent(label);
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(webUrl).catch(() => {});
  }
}
