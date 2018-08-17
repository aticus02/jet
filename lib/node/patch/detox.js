const ws = require('./../ws');
const ready = require('./../ready');
const timing = require('./../timing');

let detox;
try {
  detox = require('detox');
} catch (e) {
  // ignore
}

if (detox) {
  /* ---------------------
   *   DEVICE OVERRIDES
   * --------------------- */

  let device;
  let configLaunchApp;
  Object.defineProperty(global, 'device', {
    get() {
      return device;
    },
    set(originalDevice) {
      // device.reloadReactNative({ ... })
      // todo detoxOriginalReloadReactNative currently broken it seems
      // const detoxOriginalReloadReactNative = originalDevice.reloadReactNative.bind(originalDevice);
      originalDevice.reloadReactNative = async () => {
        ready.reset();
        global.jet.reload();
        return ready.wait();
      };

      // device.launchApp({ ... })
      const detoxOriginalLaunchApp = originalDevice.launchApp.bind(
        originalDevice
      );
      originalDevice.launchApp = async (...args) => {
        ready.reset();
        await detoxOriginalLaunchApp(...args);
        return ready.wait();
      };

      device = originalDevice;
      return originalDevice;
    },
  });

  /* -------------------
   *   DETOX OVERRIDES
   * ------------------- */

  // detox.init()
  const detoxOriginalInit = detox.init.bind(detox);
  detox.init = async (...args) => {
    ready.reset();
    await detoxOriginalInit(...args);
    if(configLaunchApp)
      await device.launchApp(configLaunchApp);
    return ready.wait();
  };


  detox.configLaunchApp = (config) => {
    if(config)
      configLaunchApp = config;
  }

  // detox.cleanup()
  const detoxOriginalCleanup = detox.cleanup.bind(detox);
  detox.cleanup = async (...args) => {
    timing.stop();
    ws.stop();
    await detoxOriginalCleanup(...args);
    // detox doesn't automatically terminate ios apps after testing
    // but does on android - added to keep consistency
    if (device.getPlatform() === 'ios') {
      await device.terminateApp();
    }
  };
}

module.exports = detox;
