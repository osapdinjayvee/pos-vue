import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pos.app',
  appName: 'Zoomin POS',
  webDir: 'dist',

  plugins: {
    CapacitorSQLite: {
      // iOS configuration
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      iosKeychainPrefix: 'pos-app',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for POS'
      },

      // Android configuration
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for POS',
        biometricSubTitle: 'Log in using biometric authentication'
      }
    },

    CapacitorHttp: {
      enabled: true
    },

    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  },

  server: {
    // Required for Android to work properly with HTTPS
    androidScheme: 'https',
    // Allow cleartext traffic for local development (disable in production)
    cleartext: true
  },

  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile'
  },

  // Android specific configuration
  android: {
    allowMixedContent: true,
    backgroundColor: '#ffffff'
  }
}

export default config
