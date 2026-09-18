/**
 * @format
 */

import { AppRegistry } from "react-native";
import { name as appName } from "./app.json";
import App, { SceneWindow } from "./src/App";

AppRegistry.registerComponent(appName, () => App);
// windows/Catalyst/WindowManager.h が別ウィンドウを開くときに使うコンポーネント名
AppRegistry.registerComponent(`${appName}Window`, () => SceneWindow);
