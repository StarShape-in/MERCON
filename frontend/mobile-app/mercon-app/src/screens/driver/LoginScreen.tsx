import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, StatusBar, FlatList, Image,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Input } from '../../components';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    // TODO: implement auth
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            {/* TODO: replace icon placeholders with lucide-react-native */}
            <Text style={styles.logoIcon}>🚛</Text>
          </View>
          <Text style={styles.brand}>MERCON</Text>
          <Text style={styles.brandSub}>Logistics Platform</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Welcome Back</Text>
          <Text style={styles.subheading}>Sign in to your driver account</Text>

          <View style={styles.form}>
            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="driver@mercon.sa"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              activeOpacity={0.8}
              onPress={() => {}}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={handleSignIn}
              disabled={loading}
            />
          </View>
        </View>

        <Text style={styles.footer}>
          Having trouble? Contact{' '}
          <Text style={styles.footerLink}>support@mercon.sa</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  scroll: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoIcon: {
    fontSize: 32,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: 4,
  },
  brandSub: {
    fontSize: Typography.xs,
    color: Colors.gray500,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  heading: {
    fontSize: Typography['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  subheading: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
  },
  forgotText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.gray500,
    marginTop: Spacing.xl,
  },
  footerLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
