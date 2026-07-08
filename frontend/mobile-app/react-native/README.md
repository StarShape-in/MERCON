# MERCON Logistics — React Native Design System

Production-ready React Native component library and screen templates for the MERCON Logistics platform.

---

## What's included

```
react-native/
├── theme/
│   └── tokens.ts          ← All design tokens (colors, spacing, radius, typography, shadows)
├── components/
│   ├── Button.tsx          ← Primary, Secondary, Outline, Ghost, Danger, Success + loading
│   ├── Badge.tsx           ← StatusBadge (auto-colors), FilterChip, SolidBadge
│   ├── Card.tsx            ← Card (white), DarkCard (dark bg)
│   ├── Input.tsx           ← Input (all states), SearchInput
│   ├── Avatar.tsx          ← Avatar (with online dot), AvatarGroup
│   ├── Typography.tsx      ← Heading, Title, Body, Caption, Overline, Mono
│   └── index.ts            ← Barrel export
├── navigation/
│   ├── DriverBottomNav.tsx    ← Dark pill, 3 tabs (Home/Trips/Profile), orange active
│   └── OperatorBottomNav.tsx  ← Dark pill, 5 items + white circle FAB with orange border
├── screens/
│   ├── driver/             ← 16 complete driver app screens
│   │   ├── SplashScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── PickupVerificationScreen.tsx
│   │   ├── LiveNavigationScreen.tsx
│   │   ├── EmergencyScreen.tsx
│   │   ├── ReplacementDriverScreen.tsx
│   │   ├── DestinationReachedScreen.tsx
│   │   ├── DeliveryVerificationScreen.tsx
│   │   ├── TripCompletedScreen.tsx
│   │   ├── TripsScreen.tsx
│   │   ├── NotificationsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── DocumentsScreen.tsx
│   │   ├── AssignedVehicleScreen.tsx
│   │   └── SettingsScreen.tsx
│   └── operator/           ← 8 complete operator app screens
│       ├── HomeScreen.tsx
│       ├── TripListScreen.tsx
│       ├── TripDetailsScreen.tsx
│       ├── CreateTripScreen.tsx
│       ├── DriverListScreen.tsx
│       ├── VehicleListScreen.tsx
│       ├── VehicleRenewalScreen.tsx
│       └── InvoiceListScreen.tsx
└── index.ts               ← Full library barrel export
```

---

## Setup

### 1. Copy the folder
Copy the entire `react-native/` directory into your RN project root.

### 2. Install dependencies

```bash
# Expo
npx expo install lucide-react-native react-native-svg \
  @react-navigation/native @react-navigation/bottom-tabs \
  @react-navigation/native-stack react-native-safe-area-context \
  react-native-screens react-native-gesture-handler

# Bare React Native
npm install lucide-react-native react-native-svg \
  @react-navigation/native @react-navigation/bottom-tabs \
  @react-navigation/native-stack react-native-safe-area-context \
  react-native-screens react-native-gesture-handler
```

### 3. Replace icon placeholders
All icon usages are currently emoji placeholders with a `// TODO:` comment.
Replace them with `lucide-react-native`:

```tsx
// Before (placeholder)
<Text>🔍</Text>

// After (lucide-react-native)
import { Search } from 'lucide-react-native';
<Search size={16} color={Colors.gray400} />
```

### 4. Load fonts (optional but recommended)
The design system uses **Plus Jakarta Sans** for headings. Load it via expo-font:

```tsx
import { useFonts } from 'expo-font';

const [loaded] = useFonts({
  'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-SemiBold': require('./assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('./assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
});
```

Then add `fontFamily: 'PlusJakartaSans-Bold'` to heading styles in `theme/tokens.ts`.

---

## Usage

### Design Tokens

```tsx
import { Colors, Spacing, Radius, Typography, Shadows } from './react-native/theme/tokens';

// Colors
Colors.primary      // #E8450F  (brand orange)
Colors.dark         // #1A1A1A  (primary text)
Colors.navBg        // #1C1C2E  (nav pill background)
Colors.success      // #16A34A
Colors.danger       // #DC2626

// Spacing (8pt grid)
Spacing.base        // 16
Spacing.lg          // 20
Spacing.xl          // 24

// Radius
Radius['2xl']       // 24
Radius.full         // 9999

// Typography
Typography.headingL   // { fontSize: 20, fontWeight: '700' }
Typography.bodyMedium // { fontSize: 14, fontWeight: '400' }
Typography.mono       // { fontSize: 12, fontFamily: 'monospace' }

// Shadows
Shadows.sm            // subtle card shadow
Shadows.primary       // orange glow for FABs
Shadows.nav           // dark pill nav shadow
```

### Components

```tsx
import { Button, Badge, StatusBadge, Card, DarkCard, Input, Avatar } from './react-native/components';

// Button
<Button label="Start Trip" onPress={handleStart} />
<Button label="Cancel" variant="secondary" />
<Button label="Delete" variant="danger" loading={deleting} />

// Status Badge (auto-picks color from status string)
<StatusBadge status="In Transit" dot />
<StatusBadge status="Completed" />
<StatusBadge status="Delayed" />

// Card
<Card style={{ padding: 16 }}>
  <Text>Content</Text>
</Card>

// Dark Card (for dashboards)
<DarkCard style={{ padding: 16 }}>
  <Text style={{ color: 'white' }}>Trip TRP-2387</Text>
</DarkCard>

// Input
<Input
  label="Driver Name"
  placeholder="Enter name"
  value={name}
  onChangeText={setName}
/>
<Input label="Password" secureTextEntry state="error" errorText="Invalid credentials" />

// Avatar
<Avatar initials="AK" color={Colors.primary} size="lg" onlineStatus="online" />
```

### Navigation

```tsx
import { DriverBottomNav } from './react-native/navigation/DriverBottomNav';
import { OperatorBottomNav } from './react-native/navigation/OperatorBottomNav';

// Driver nav
<DriverBottomNav activeTab="Home" onTabPress={(tab) => setActiveTab(tab)} />

// Operator nav  
<OperatorBottomNav
  activeTab="Trips"
  onTabPress={(tab) => setActiveTab(tab)}
  onFabPress={() => navigation.navigate('CreateTrip')}
/>
```

### Using a Screen

```tsx
import HomeScreen from './react-native/screens/driver/HomeScreen';
// or
import { HomeScreen } from './react-native/screens/driver/HomeScreen';
```

---

## React Navigation Setup

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// Driver App
export function DriverApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash"    component={SplashScreen} />
        <Stack.Screen name="Login"     component={LoginScreen} />
        <Stack.Screen name="Home"      component={HomeScreen} />
        <Stack.Screen name="Trips"     component={TripsScreen} />
        <Stack.Screen name="Profile"   component={ProfileScreen} />
        {/* ... */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## Design Principles

| Token type | Convention |
|---|---|
| Colors | `Colors.primary`, `Colors.success`, etc. |
| Spacing | `Spacing.base` (16), `Spacing.xl` (24) — 8pt grid |
| Radius | `Radius.xl` (20), `Radius['2xl']` (24), `Radius.full` (9999) |
| Typography | `Typography.headingL`, `Typography.bodyMedium` |
| Shadows | `Shadows.sm`, `Shadows.md`, `Shadows.primary` |

**Never hardcode hex colors, spacing numbers, or font sizes.**
Always reference the token system.

---

## Platform Notes

- Tested with React Native 0.73+ and Expo SDK 50+
- Uses `SafeAreaView` on all screens for iPhone notch/Dynamic Island support
- `StatusBar` configured per-screen
- All lists use `FlatList` for virtualization performance
- `activeOpacity={0.8}` on all `TouchableOpacity` elements
- RTL-ready structure (use `I18nManager.isRTL` to flip layouts for Arabic)

---

© 2025 Mercon Logistics Services Company
