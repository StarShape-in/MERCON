import type { ExpoConfig } from 'expo/config';

/**
 * Per-client build profile. Each client gets its own binary, bundle
 * identifier, and store listing — Expo bakes icons/splash/bundle ID in at
 * build time, so these can't be swapped at runtime the way web branding can
 * (see Settings / useBranding on the web dashboard). Selected via
 * APP_CLIENT at build time (EAS build profile env, or local `APP_CLIENT=mtl
 * npx expo start`); defaults to mercon so no env change is required for the
 * existing app.
 *
 * Adding a new client: add its assets under assets/images/<client>/, add a
 * profile below, and give its EAS build profile (eas.json) APP_CLIENT=<key>.
 */
const CLIENT_PROFILES = {
  mercon: {
    name: 'mercon-app',
    slug: 'mercon-app',
    scheme: 'merconapp',
    iosBundleIdentifier: 'com.sayedhysam.mercon-app',
    androidPackage: 'com.sayedhysam.merconapp',
    icon: './assets/images/mercon-logo.png',
    splashImage: './assets/images/mercon-logo.png',
    androidAdaptiveForeground: './assets/images/mercon-logo.png',
    androidAdaptiveBackground: './assets/images/android-icon-background.png',
    androidAdaptiveMonochrome: './assets/images/android-icon-monochrome.png',
    favicon: './assets/images/favicon.png',
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://dev.mercon.tech/api',
    // Single source of truth for the mobile brand color — src/theme/tokens.ts
    // reads these via expo-constants instead of redefining them. Native
    // builds can't re-theme at runtime the way the web dashboard's CSS vars
    // do, so this is still a build-time value, just centralized in one place.
    brandColor: '#E8450F',
    brandColorLight: '#FFF0EB',
    brandColorDark: '#C7380A',
  },
  // mtl: { ... } — add once MTL's mobile assets and bundle IDs exist.
} as const;

type ClientKey = keyof typeof CLIENT_PROFILES;

const clientKey = (process.env.APP_CLIENT as ClientKey) || 'mercon';
const client = CLIENT_PROFILES[clientKey];

if (!client) {
  throw new Error(
    `Unknown APP_CLIENT "${process.env.APP_CLIENT}" — add a profile for it in app.config.ts's CLIENT_PROFILES.`,
  );
}

export default (): ExpoConfig => ({
  name: client.name,
  slug: client.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: client.icon,
  scheme: client.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: client.iosBundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#000000',
      foregroundImage: client.androidAdaptiveForeground,
      backgroundImage: client.androidAdaptiveBackground,
      monochromeImage: client.androidAdaptiveMonochrome,
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    package: client.androidPackage,
  },
  web: {
    output: 'static',
    favicon: client.favicon,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#000000',
        image: client.splashImage,
        imageWidth: 200,
      },
    ],
    'expo-secure-store',
    [
      'expo-image-picker',
      {
        cameraPermission: `${client.name} uses the camera to capture cargo and proof-of-delivery photos for your trips.`,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: `${client.name} shares your location with your operator while you're on an active trip, so they can track the delivery.`,
      },
    ],
    'expo-image',
    'expo-status-bar',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'e5be404c-d6c0-4285-bfce-d459a605400a',
    },
    // Read by src/lib/api.ts as the required fallback when EXPO_PUBLIC_API_URL
    // isn't set — per-client, so a misconfigured build can't silently talk to
    // another client's API.
    apiUrl: client.apiUrl,
    brandColor: client.brandColor,
    brandColorLight: client.brandColorLight,
    brandColorDark: client.brandColorDark,
  },
  owner: 'sayedhysam',
});
