// Gesture handler must be imported before anything else (per RNGH docs).
import 'react-native-gesture-handler';

import { registerRootComponent } from 'expo';

import App from '@/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and ensures the environment is set up appropriately for Expo (dev/native/web).
registerRootComponent(App);
