import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface OPSConnectWidgetProps {
  /** Partner ID from the OPSConnect dashboard (e.g. "PART-XXXX-XXXX") */
  partnerId: string;
  /** Supabase edge function base URL (e.g. "https://xxx.supabase.co/functions/v1") */
  api: string;
  /** Business display name shown in the widget header */
  name?: string;
  /** 1-2 letter avatar initials — used when no logo is set */
  avatar?: string;
  /** Full URL to the partner logo image */
  logo?: string;
  /** Gradient start color (hex) */
  colorFrom?: string;
  /** Gradient end color (hex) */
  colorTo?: string;
  /** Default language code: en, km, zh, ja, ko, th, vi, id, fr, es */
  lang?: string;
  /** Channel contact links */
  messenger?: string;
  whatsapp?: string;
  telegram?: string;
  line?: string;
  instagram?: string;
  email?: string;
  /** Called when the widget is closed (user taps X) */
  onClose?: () => void;
  /** Base URL of OPSConnect deployment */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://chat.opssolutions.tech';

export function OPSConnectWidget({
  partnerId,
  api,
  name = 'Support',
  avatar = '?',
  logo = '',
  colorFrom = '#24396D',
  colorTo = '#38BDEB',
  lang = '',
  messenger = '',
  whatsapp = '',
  telegram = '',
  line = '',
  instagram = '',
  email = '',
  onClose,
  baseUrl = DEFAULT_BASE_URL,
}: OPSConnectWidgetProps) {
  const webViewRef = useRef<WebView>(null);

  const params = new URLSearchParams({
    partner_id: partnerId,
    api,
    name,
    avatar,
    logo,
    color_from: colorFrom,
    color_to: colorTo,
    lang,
    messenger,
    whatsapp,
    telegram,
    line,
    instagram,
    email,
  });

  const uri = `${baseUrl}/widget-mobile.html?${params.toString()}`;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'close' && onClose) onClose();
    } catch {
      // ignore non-JSON messages
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri }}
        style={styles.webview}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colorFrom} />
          </View>
        )}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
