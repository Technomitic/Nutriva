/**
 * Fresh — Permission Manager
 * Handles requesting all necessary permissions on app launch
 */

import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Camera } from 'expo-camera';

export interface PermissionStatus {
  camera: boolean;
  photos: boolean;
  location: boolean;
  notifications: boolean;
  microphone: boolean;
}

/**
 * Safely get expo-notifications module
 * (Push notifications aren't supported in Expo Go since SDK 53)
 */
function getNotificationsModule() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Request all permissions at once — call on first app launch
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
  const result: PermissionStatus = {
    camera: false,
    photos: false,
    location: false,
    notifications: false,
    microphone: false,
  };

  // Skip on web — browser handles its own permission model
  if (Platform.OS === 'web') {
    // Request notification permission on web
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        result.notifications = perm === 'granted';
      } catch {
        result.notifications = false;
      }
    }
    // Request location on web
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(() => resolve(), () => reject(), { timeout: 5000 });
        });
        result.location = true;
      } catch {
        result.location = false;
      }
    }
    return result;
  }

  // ── Camera ──
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    result.camera = status === 'granted';
  } catch {
    result.camera = false;
  }

  // ── Photo Library ──
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    result.photos = status === 'granted';
  } catch {
    result.photos = false;
  }

  // ── Location ──
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    result.location = status === 'granted';
  } catch {
    result.location = false;
  }

  // ── Notifications ──
  try {
    const Notifications = getNotificationsModule();
    if (Notifications) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        result.notifications = status === 'granted';
      } else {
        result.notifications = true;
      }
    }
  } catch {
    result.notifications = false;
  }

  // ── Microphone ──
  try {
    const { status } = await Camera.requestMicrophonePermissionsAsync();
    result.microphone = status === 'granted';
  } catch {
    result.microphone = false;
  }

  return result;
}

/**
 * Check current permission statuses without requesting
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  const result: PermissionStatus = {
    camera: false,
    photos: false,
    location: false,
    notifications: false,
    microphone: false,
  };

  if (Platform.OS === 'web') return result;

  try {
    const cam = await Camera.getCameraPermissionsAsync();
    result.camera = cam.status === 'granted';
  } catch {}

  try {
    const photos = await ImagePicker.getMediaLibraryPermissionsAsync();
    result.photos = photos.status === 'granted';
  } catch {}

  try {
    const loc = await Location.getForegroundPermissionsAsync();
    result.location = loc.status === 'granted';
  } catch {}

  try {
    const Notifications = getNotificationsModule();
    if (Notifications) {
      const notif = await Notifications.getPermissionsAsync();
      result.notifications = notif.status === 'granted';
    }
  } catch {}

  try {
    const mic = await Camera.getMicrophonePermissionsAsync();
    result.microphone = mic.status === 'granted';
  } catch {}

  return result;
}

/**
 * Open device settings if a permission was denied
 */
export function openAppSettings() {
  if (Platform.OS === 'web') return;
  Linking.openSettings();
}

/**
 * Configure notification handler (call once in app root)
 */
export function configureNotifications() {
  try {
    const Notifications = getNotificationsModule();
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch {
    // Notifications not available (e.g., Expo Go)
  }
}
