import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.anuragtripathy.spendy',
  appName: 'spendy',
  webDir: 'dist',
  backgroundColor: '#f4f4f1',
  ios: {
    // Let the web layer handle the notch / home bar via env(safe-area-inset-*).
    contentInset: 'never',
  },
}

export default config
