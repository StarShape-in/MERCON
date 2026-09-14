import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/lib/auth-context';
import { getSocket } from '@/lib/socket';
import { tripService, type MobileTrip } from '@/lib/trips';
import { notificationService } from '@/lib/notifications';
import { DelayReportModal } from './DelayReportModal';
import { queryClient } from '@/lib/query-client';

/**
 * Global driver notification manager:
 * 1. Handles real-time Socket.io foreground prompts when AppState === 'active'.
 * 2. Unbinds notification listener in background/inactive to prevent duplicate alerts.
 *    Does NOT disconnect the shared socket singleton so live tracking is not disrupted.
 * 3. Handles background / cold-start push notification taps via expo-notifications
 *    (including getLastNotificationResponseAsync for cold starts).
 * 4. Resolves the active trip and safely triggers the existing DelayReportModal with stale-trip guards.
 */

// Cache handled notification response identifiers to prevent duplicate executions across remounts/cold starts
const handledResponseIds = new Set<string>();

export function DriverNotificationManager() {
  const { role, profile, isLoggedIn } = useAuth();
  const [delayModalVisible, setDelayModalVisible] = useState(false);
  const [activeTrip, setActiveTrip] = useState<MobileTrip | null>(null);
  const socketRef = useRef<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Safely opens the existing DelayReportModal for the active trip,
   * applying stale push protection (cancellation, reassignment, completion).
   */
  const handleOpenDelayWorkflow = async (expectedTripId?: string) => {
    try {
      const currentTrip = await tripService.getCurrent();

      if (!currentTrip || !currentTrip.id) {
        Alert.alert('Trip Unavailable', 'No active trip was found for your account.');
        return;
      }

      // Stale trip guards
      if (currentTrip.status === 'Cancelled') {
        Alert.alert('Trip Cancelled', 'This trip has been cancelled.');
        return;
      }

      if (currentTrip.status === 'Completed' || currentTrip.status === 'Invoiced') {
        Alert.alert('Trip Completed', 'This trip has already been completed.');
        return;
      }

      if (expectedTripId && currentTrip.id !== expectedTripId) {
        Alert.alert('Trip Reassigned', 'This trip is no longer active or assigned to you.');
        return;
      }

      setActiveTrip(currentTrip);
      setDelayModalVisible(true);
    } catch (err) {
      console.warn('[NotificationManager] Failed to resolve active trip:', err);
      Alert.alert('Error', 'Could not load the active trip details. Please check your connection.');
    }
  };

  /**
   * Present an in-app prompt when a delay notification arrives while the driver is in the app.
   */
  const handleForegroundDelayPrompt = (payload: any) => {
    const tripId = payload?.entity_id || payload?.metadata?.tripId;
    const notificationId = payload?.id;

    Alert.alert(
      'Trip Delay Detected',
      payload?.message || 'Your trip is delayed. Please report the reason for the delay.',
      [
        {
          text: 'Dismiss',
          style: 'cancel',
          onPress: () => {
            if (notificationId) {
              notificationService.markRead(notificationId).catch(() => {});
            }
          },
        },
        {
          text: 'Report Delay',
          onPress: () => {
            if (notificationId) {
              notificationService.markRead(notificationId).catch(() => {});
            }
            handleOpenDelayWorkflow(tripId);
          },
        },
      ]
    );
  };

  // 1. Socket.io Foreground Lifecycle (active only when app is foregrounded)
  useEffect(() => {
    if (!isLoggedIn || role !== 'Driver' || !profile?.id) {
      return;
    }

    const driverId = profile.id;
    let activeSocket: any = null;

    const connectAndListen = async () => {
      try {
        const socket = await getSocket();
        activeSocket = socket;
        socketRef.current = socket;

        const eventName = `driver:notification:${driverId}`;
        socket.off(eventName); // avoid duplicate listeners
        socket.on(eventName, (payload: any) => {
          if (payload?.type === 'TripDelayPrompt') {
            handleForegroundDelayPrompt(payload);
          }
        });
      } catch (err) {
        console.warn('[NotificationManager] Socket connection error:', err);
      }
    };

    const cleanupSocket = () => {
      const socket = activeSocket || socketRef.current;
      if (socket) {
        const eventName = `driver:notification:${driverId}`;
        socket.off(eventName);
      }
    };

    if (AppState.currentState === 'active') {
      connectAndListen();
    }

    const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        connectAndListen();
      } else if (nextAppState.match(/inactive|background/)) {
        cleanupSocket();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      cleanupSocket();
      appStateSub.remove();
    };
  }, [isLoggedIn, role, profile?.id]);

  // 2. Background / Cold-Start Push Notification Tap Handlers
  useEffect(() => {
    if (!isLoggedIn || role !== 'Driver') {
      return;
    }

    let isMounted = true;

    const processNotificationResponse = (response: Notifications.NotificationResponse) => {
      const identifier = response?.notification?.request?.identifier;
      if (identifier) {
        if (handledResponseIds.has(identifier)) {
          return;
        }
        handledResponseIds.add(identifier);
      }

      const data = response?.notification?.request?.content?.data as any;
      if (data?.type === 'TripDelayPrompt') {
        if (data?.notificationId) {
          notificationService.markRead(data.notificationId).catch(() => {});
        }
        handleOpenDelayWorkflow(data?.tripId);
      }
    };

    // A. Cold-start push response recovery:
    // When the app is launched by tapping a push notification from a terminated state,
    // the tap occurred before this component mounted. Retrieve the launch response.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (isMounted && response) {
          processNotificationResponse(response);
        }
      })
      .catch((err) => {
        console.warn('[NotificationManager] Error checking cold-start notification:', err);
      });

    // B. Warm / background push notification response listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      processNotificationResponse
    );

    return () => {
      isMounted = false;
      responseSubscription.remove();
    };
  }, [isLoggedIn, role]);

  if (!isLoggedIn || role !== 'Driver') {
    return null;
  }

  return (
    <DelayReportModal
      visible={delayModalVisible}
      tripId={activeTrip?.id ?? null}
      onClose={() => {
        setDelayModalVisible(false);
      }}
      onSuccess={() => {
        setDelayModalVisible(false);
        queryClient.invalidateQueries();
      }}
    />
  );
}
