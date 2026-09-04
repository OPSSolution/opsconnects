import React, { useRef } from 'react';
import { Linking, StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

export interface OPSConnectWidgetProps {
  partnerId: string;
  api: string;
  name?: string;
  avatar?: string;
  logo?: string;
  colorFrom?: string;
  colorTo?: string;
  lang?: string;
  messenger?: string;
  whatsapp?: string;
  telegram?: string;
  line?: string;
  instagram?: string;
  email?: string;
  onClose?: () => void;
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
  const webViewRef = useRef<InstanceType<typeof WebView>>(null);

  const qs = [
    'partner_id=' + encodeURIComponent(partnerId),
    'api=' + encodeURIComponent(api),
    'name=' + encodeURIComponent(name),
    'avatar=' + encodeURIComponent(avatar),
    'logo=' + encodeURIComponent(logo),
    'color_from=' + encodeURIComponent(colorFrom),
    'color_to=' + encodeURIComponent(colorTo),
    'lang=' + encodeURIComponent(lang),
    'messenger=' + encodeURIComponent(messenger),
    'whatsapp=' + encodeURIComponent(whatsapp),
    'telegram=' + encodeURIComponent(telegram),
    'line=' + encodeURIComponent(line),
    'instagram=' + encodeURIComponent(instagram),
    'email=' + encodeURIComponent(email),
  ].join('&');

  const uri = baseUrl + '/mobile-chat.html?' + qs;

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'close' && onClose) onClose();
    } catch {}
  };

  // Keep the widget's own pages inside this WebView, but hand every other
  // link (Telegram, WhatsApp, mailto:, etc.) to the OS instead of letting
  // react-native-webview open it in a second in-app WebView — that second
  // WebView is what surfaces as "unsupported URL" (NSURLErrorDomain -1002)
  // when a partner's configured link is malformed.
  const onShouldStartLoadWithRequest = (request: { url: string }) => {
    if (request.url.startsWith(baseUrl)) return true;
    Linking.openURL(request.url).catch(() => {});
    return false;
  };

  return React.createElement(
    View,
    { style: styles.container },
    React.createElement(WebView, {
      ref: webViewRef,
      source: { uri },
      style: styles.webview,
      startInLoadingState: true,
      javaScriptEnabled: true,
      domStorageEnabled: true,
      originWhitelist: ['*'],
      onMessage,
      onShouldStartLoadWithRequest,
      setSupportMultipleWindows: false,
      renderLoading: () =>
        React.createElement(
          View,
          { style: styles.loader },
          React.createElement(ActivityIndicator, {
            size: 'large',
            color: colorFrom,
          }),
        ),
    }),
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1 },
  loader: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
