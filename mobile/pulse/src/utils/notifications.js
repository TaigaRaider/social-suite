export async function registerForPushNotifications() {
  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');
    const { Platform } = await import('react-native');

    Notifications.default.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (!Device.default?.isDevice) return null;

    const { status: existing } = await Notifications.default.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.default.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    const token = await Notifications.default.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    return null;
  }
}

export function setupNotificationListeners(navigation) {
  let sub1 = null;
  let sub2 = null;

  import('expo-notifications').then(Notifications => {
    Notifications.default.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    sub1 = Notifications.default.addNotificationReceivedListener(notification => {
      // handle foreground notification
    });

    sub2 = Notifications.default.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.screen && navigation) {
        navigation.navigate(data.screen, data.params || {});
      }
    });
  }).catch(() => {});

  return {
    remove() {
      sub1?.remove();
      sub2?.remove();
    },
  };
}
