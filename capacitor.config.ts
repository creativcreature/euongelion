import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.euangelion.app',
  appName: 'Euangelion',
  webDir: 'public/ios-shell',
  server: {
    url:
      process.env.CAPACITOR_LIVE_URL?.trim() || 'https://euangelion.app',
    cleartext: false,
    allowNavigation: ['euangelion.app', '*.euangelion.app', '*.supabase.co'],
  },
  ios: {
    backgroundColor: '#0B1420',
    contentInset: 'automatic',
    scrollEnabled: true,
  },
}

export default config
