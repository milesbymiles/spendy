import { Capacitor } from '@capacitor/core'

/** True when running inside the iOS app shell rather than a browser. */
export const isNative = Capacitor.isNativePlatform()
