import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { DriverBottomNav } from '../../navigation/DriverBottomNav';

const NOTIFICATIONS = [
  {
    id: '1',
    icon: '🚛',
    title: 'Trip Assignment',
    body: 'You have been assigned trip #TRP-2024-0892 — Riyadh to Taif. Departure: Tomorrow 07:00.',
    time: '5 min ago',
    unread: true,
    type: 'trip',
  },
  {
    id: '2',
    icon: '⚠️',
    title: 'Route Alert',
    body: 'Traffic congestion reported on King Fahd Road near Exit 14. Alternative route available.',
    time: '1 hr ago',
    unread: true,
    type: 'alert',
  },
  {
    id: '3',
    icon: '💰',
    title: 'Earnings Credited',
    body: 'SAR 420.00 has been credited for trip #TRP-2024-0891 — Riyadh to Jeddah.',
    time: '3 hr ago',
    unread: false,
    type: 'payment',
  },
  {
    id: '4',
    icon: '📋',
    title: 'Document Expiry',
    body: 'Your Driving License expires in 15 days. Please renew before 20 Jul 2024.',
    time: 'Yesterday',
    unread: false,
    type: 'doc',
  },
  {
    id: '5',
    icon: '⭐',
    title: 'Rating Received',
    body: 'Customer Saudi Electronics Co. rated your trip 5 stars. Keep up the great work!',
    time: 'Yesterday',
    unread: false,
    type: 'rating',
  },
  {
    id: '6',
    icon: '🔧',
    title: 'Vehicle Service Due',
    body: 'TRK-2041 is due for scheduled maintenance in 2 days. Contact fleet manager.',
    time: '2 days ago',
    unread: false,
    type: 'vehicle',
  },
  {
    id: '7',
    icon: '📍',
    title: 'Geofence Alert',
    body: 'You have entered the Jeddah Port zone. Proceed to Gate 7 for cargo delivery.',
    time: '3 days ago',
    unread: false,
    type: 'geo',
  },
];

const NotificationCard = ({ item, onPress }: any) => (
  <TouchableOpacity
    style={[styles.card, item.unread ? styles.cardUnread : null]}
    activeOpacity={0.8}
    onPress={onPress}
  >
    <View style={[styles.iconBox, item.unread ? styles.iconBoxUnread : null]}>
      {/* TODO: replace icon placeholders with lucide-react-native */}
      <Text style={styles.iconText}>{item.icon}</Text>
    </View>
    <View style={styles.content}>
      <View style={styles.contentHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
    </View>
    {item.unread && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

const NotificationsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [notifications, setNotifications] = useState(NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} activeOpacity={0.8} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() =>
              setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
              )
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptyText}>No new notifications.</Text>
          </View>
        }
      />
      <DriverBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: Colors.gray900,
  },
  unreadCount: {
    fontSize: Typography.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  markAllBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  markAllText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBoxUnread: {
    backgroundColor: '#FFF7ED',
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
    flex: 1,
  },
  time: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    flexShrink: 0,
  },
  body: {
    fontSize: Typography.xs,
    color: Colors.gray600,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: Spacing.xs,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    gap: Spacing.sm,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray700,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.gray500,
  },
});

export default NotificationsScreen;
