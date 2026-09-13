/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { setConfig } from '@kesha-antonov/react-native-background-downloader';
import App from './App';
import { name as appName } from './app.json';
import './src/notifications/background';
import { logDebug } from './src/services/debugLog';

setConfig({
  isLogsEnabled: true,
  logCallback: (tag, message, ...args) => logDebug(tag, message, ...args),
});

AppRegistry.registerComponent(appName, () => App);
