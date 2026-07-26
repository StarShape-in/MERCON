/**
 * Shared MERCON login screen (drivers AND operators).
 * One form, no mode toggle: the user enters their credentials and `signIn`
 * (see lib/auth-context) figures out whether they belong to a driver
 * (phone + license) or an operator (username + password).
 * After sign-in, the auth guard in app/_layout.tsx + role routing in
 * app/index.tsx send the user to the correct home screen.
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, ImageBackground,
  StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { User, Lock, Eye, EyeOff, ArrowRight, Headset } from 'lucide-react-native';
import { Colors, Spacing, Radius, Typography, Shadows } from '../../theme/tokens';
import { Button, Input } from '../../components';
import { useAuth } from '../../lib/auth-context';
import { api, getApiErrorMessage } from '../../lib/api';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logo = require('../../../assets/images/mercon-logo.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const heroBg = require('../../../assets/images/login-hero.png');

const LoginScreen = () => {
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleForgot = async () => {
    setError(null);
    setNotice(null);
    if (!identifier.trim()) {
      setError('Enter your username or mobile number first, then tap "Can\'t log in?" again.');
      return;
    }
    try {
      // Notifies all operators/admins that this user needs a reset.
      await api.post('/auth/request-reset', { identifier: identifier.trim() });
      setNotice('Your operator has been notified. They will help you log in.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSignIn = async () => {
    if (!identifier.trim() || !secret.trim()) {
      setError('Please enter your credentials.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await signIn(identifier, secret);
      // Success: the auth guard in app/_layout.tsx switches away from login.
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={heroBg} style={styles.container} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.gray50} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Card */}
        <View style={styles.card}>
          <View style={styles.form}>
            <Input
              label="Username or Mobile Number"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Username or +9665XXXXXXXX"
              autoCapitalize="none"
              iconLeft={<User size={20} color={Colors.gray400} />}
            />
            <Input
              label="Password or License Number"
              value={secret}
              onChangeText={setSecret}
              placeholder="Enter your password or license number"
              autoCapitalize="none"
              secureTextEntry={!showSecret}
              iconLeft={<Lock size={20} color={Colors.gray400} />}
              iconRight={
                <TouchableOpacity onPress={() => setShowSecret((v) => !v)} hitSlop={8} activeOpacity={0.7}>
                  {showSecret
                    ? <EyeOff size={20} color={Colors.gray400} />
                    : <Eye size={20} color={Colors.gray400} />}
                </TouchableOpacity>
              }
            />

            {error && <Text style={styles.errorText}>{error}</Text>}
            {notice && <Text style={styles.noticeText}>{notice}</Text>}

            <Button
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={handleSignIn}
              disabled={loading}
              size="lg"
              iconRight={!loading ? <ArrowRight size={20} color={Colors.white} /> : undefined}
            />
          </View>
        </View>

        {/* Notify my operator — outside the card */}
        <TouchableOpacity onPress={handleForgot} activeOpacity={0.7} style={styles.notifyBtn}>
          <Headset size={20} color={Colors.primary} />
          <Text style={styles.notifyText}>Can't log in? Notify my operator</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Having trouble? Contact{' '}
          <Text style={styles.footerLink}>support@mercon.sa</Text>
        </Text>
      </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    justifyContent: 'flex-start',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 130,
    marginBottom: 150,
  },
  logo: {
    width: 180,
    height: 96,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    ...Shadows.lg,
  },
  form: {
    gap: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.danger,
    marginTop: -Spacing.xs,
  },
  noticeText: {
    fontSize: Typography.sm,
    color: Colors.success,
    marginTop: -Spacing.xs,
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  notifyText: {
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
