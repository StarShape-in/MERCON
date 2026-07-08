import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { StatusBadge } from '../../components';

const DOCUMENTS = [
  {
    id: '1',
    title: 'Driving License',
    docNumber: 'DL-SA-1234567',
    expiry: '20 Jul 2024',
    status: 'expiring',
    statusLabel: 'Expiring Soon',
    icon: '🪪',
  },
  {
    id: '2',
    title: 'Iqama (Residency)',
    docNumber: 'IQM-9876543',
    expiry: '15 Dec 2024',
    status: 'valid',
    statusLabel: 'Valid',
    icon: '📋',
  },
  {
    id: '3',
    title: 'National ID',
    docNumber: 'NID-1122334455',
    expiry: '30 Mar 2026',
    status: 'valid',
    statusLabel: 'Valid',
    icon: '🪪',
  },
  {
    id: '4',
    title: 'Medical Certificate',
    docNumber: 'MED-2024-0456',
    expiry: '05 Jan 2024',
    status: 'expired',
    statusLabel: 'Expired',
    icon: '🏥',
  },
  {
    id: '5',
    title: 'Heavy Vehicle License',
    docNumber: 'HVL-SA-7890123',
    expiry: '12 Sep 2025',
    status: 'valid',
    statusLabel: 'Valid',
    icon: '🚛',
  },
];

const DocumentCard = ({ item }: any) => (
  <View style={[styles.card, item.status === 'expired' ? styles.cardExpired : null]}>
    <View style={styles.cardHeader}>
      <View style={styles.iconBox}>
        {/* TODO: replace icon placeholders with lucide-react-native */}
        <Text style={styles.docIcon}>{item.icon}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.docTitle}>{item.title}</Text>
        <Text style={styles.docNumber}>{item.docNumber}</Text>
      </View>
      <StatusBadge status={item.status} label={item.statusLabel} />
    </View>

    <View style={styles.expiryRow}>
      <Text style={styles.expiryLabel}>Expires</Text>
      <Text style={[styles.expiryValue, item.status === 'expired' ? styles.expiredText : item.status === 'expiring' ? styles.expiringText : null]}>
        {item.expiry}
      </Text>
    </View>

    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.viewBtn} activeOpacity={0.8} onPress={() => {}}>
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.8} onPress={() => {}}>
        {/* TODO: replace icon placeholders with lucide-react-native */}
        <Text style={styles.downloadBtnText}>↓ Download</Text>
      </TouchableOpacity>
      {(item.status === 'expired' || item.status === 'expiring') && (
        <TouchableOpacity style={styles.renewBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.renewBtnText}>Renew</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const DocumentsScreen = ({ navigation }: any) => {
  const expiredCount = DOCUMENTS.filter((d) => d.status === 'expired').length;
  const expiringCount = DOCUMENTS.filter((d) => d.status === 'expiring').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray100 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => navigation?.goBack()}>
          {/* TODO: replace icon placeholders with lucide-react-native */}
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Documents</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Banner */}
      {(expiredCount > 0 || expiringCount > 0) && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {expiredCount > 0 && `${expiredCount} document(s) expired. `}
            {expiringCount > 0 && `${expiringCount} document(s) expiring soon.`}
          </Text>
        </View>
      )}

      <FlatList
        data={DOCUMENTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <DocumentCard item={item} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: Colors.gray900,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    color: Colors.gray900,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 22,
    color: Colors.white,
    fontWeight: '700',
    lineHeight: 26,
  },
  alertBanner: {
    backgroundColor: '#FFF7ED',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#FED7AA',
  },
  alertIcon: {
    fontSize: 18,
  },
  alertText: {
    fontSize: Typography.sm,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    gap: Spacing.md,
  },
  cardExpired: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  docIcon: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  docNumber: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  expiryLabel: {
    fontSize: Typography.xs,
    color: Colors.gray500,
  },
  expiryValue: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.gray900,
  },
  expiredText: {
    color: Colors.error,
  },
  expiringText: {
    color: '#D97706',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  viewBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: Typography.sm,
    color: Colors.gray700,
    fontWeight: '600',
  },
  downloadBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  renewBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  renewBtnText: {
    fontSize: Typography.sm,
    color: Colors.white,
    fontWeight: '700',
  },
});

export default DocumentsScreen;
