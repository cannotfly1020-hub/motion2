// Capacitor のネイティブ呼び出し。ブラウザで開いたときは何もしない。
// クラシック script から使うため、import は使わない。

function nativePlatform() {
  return typeof Capacitor !== 'undefined' &&
    typeof Capacitor.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform();
}

function nativeHaptic(style) {
  if (!nativePlatform()) return;
  Capacitor.nativePromise('Haptics', 'impact', { style: style || 'LIGHT' }).catch(function() {});
}

function nativeHapticSuccess() {
  if (!nativePlatform()) return;
  Capacitor.nativePromise('Haptics', 'notification', { type: 'SUCCESS' }).catch(function() {});
}

function nativePrepareCapture() {
  if (!nativePlatform()) return Promise.resolve();
  return Capacitor.nativePromise('Camera', 'requestPermissions', {
    permissions: ['camera', 'photos']
  }).catch(function() {});
}

function nativePickVideo() {
  if (!nativePlatform()) return Promise.resolve(null);
  return nativePrepareCapture().then(function() {
    return Capacitor.nativePromise('Camera', 'chooseFromGallery', {
      mediaType: 1,
      allowMultipleSelection: false
    });
  }).then(function(res) {
    var item = res && res.results && res.results[0];
    return nativeVideoSrc(item);
  }).catch(function() {
    return null;
  });
}

function nativeRecordVideo() {
  if (!nativePlatform()) return Promise.resolve(null);
  return nativePrepareCapture().then(function() {
    return Capacitor.nativePromise('Camera', 'recordVideo', {
      saveToGallery: true,
      isPersistent: true
    });
  }).then(function(item) {
    return nativeVideoSrc(item);
  }).catch(function() {
    return null;
  });
}

function nativeVideoSrc(item) {
  if (!item) return null;
  if (item.webPath) return item.webPath;
  if (item.uri && typeof Capacitor.convertFileSrc === 'function') {
    return Capacitor.convertFileSrc(item.uri);
  }
  return item.uri || null;
}

function nativeLockPortrait() {
  if (!nativePlatform()) return;
  Capacitor.nativePromise('ScreenOrientation', 'lock', { orientation: 'portrait' }).catch(function() {});
}

function nativeSharePayload(title, text) {
  if (!nativePlatform()) return Promise.resolve(false);

  var canvas = document.getElementById('output-canvas');
  var write = Promise.resolve(null);
  if (canvas && canvas.width > 0 && canvas.height > 0) {
    try {
      var b64 = canvas.toDataURL('image/png').split(',')[1];
      write = Capacitor.nativePromise('Filesystem', 'writeFile', {
        path: 'motion2-share.png',
        data: b64,
        directory: 'CACHE',
        recursive: true
      }).then(function() {
        return Capacitor.nativePromise('Filesystem', 'getUri', {
          path: 'motion2-share.png',
          directory: 'CACHE'
        });
      }).then(function(res) {
        return res && res.uri ? res.uri : null;
      }).catch(function() {
        return null;
      });
    } catch (err) {
      write = Promise.resolve(null);
    }
  }

  return write.then(function(uri) {
    var options = {
      title: title,
      text: text,
      dialogTitle: '共有'
    };
    if (uri) options.files = [uri];
    return Capacitor.nativePromise('Share', 'share', options);
  }).then(function() {
    return true;
  }).catch(function() {
    return false;
  });
}

nativeLockPortrait();
