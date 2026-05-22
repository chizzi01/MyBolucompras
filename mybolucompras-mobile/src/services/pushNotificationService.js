import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const pushNotificationService = {
  async registerAndSaveToken() {
    if (!Device.isDevice) {
      console.log('[Push] Not a physical device — skipping token registration');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Budget Buddy',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Push] Notification permission not granted');
      return null;
    }

    // Get raw FCM device token (not Expo push token)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;

    if (!fcmToken) {
      console.warn('[Push] getDevicePushTokenAsync returned empty token');
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Push] No authenticated user — cannot save FCM token');
      return null;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, fcm_token: fcmToken }, { onConflict: 'id' });

    if (error) {
      console.warn('[Push] Failed to save FCM token to profiles:', error.message);
    } else {
      console.log('[Push] FCM token saved to profiles:', fcmToken.slice(0, 20) + '...');
    }

    return fcmToken;
  },

  async getTokenForUser(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[Push] getTokenForUser error:', error.message);
      return null;
    }
    return data?.fcm_token ?? null;
  },

  async sendPushNotification({ token, title, body, data = {} }) {
    if (!token) return;
    console.log('[Push] Invoking edge function with token:', token.slice(0, 20) + '...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      const res = await fetch(
        'https://hmlcgwptszhqknyrmarf.supabase.co/functions/v1/send-push-notification',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, title, body, data }),
        }
      );
      const text = await res.text();
      console.log('[Push] Edge function status:', res.status, '| body:', text);
    } catch (err) {
      console.warn('[Push] Failed to send push notification:', err?.message);
    }
  },
};
