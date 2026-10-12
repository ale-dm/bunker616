package com.comicreader

import android.view.KeyEvent
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "ComicReader"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  // Con el lector abierto y la opción activa, el volumen pasa páginas: abajo = siguiente,
  // arriba = anterior. Fuera de ahí, las teclas siguen cambiando el volumen del sistema.
  override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
    if (isPageTurnKey(keyCode) && AppNativeModule.volumeKeysEnabled) {
      if (event?.repeatCount == 0) {
        emitVolumeKey(keyCode)
      }
      return true
    }
    return super.onKeyDown(keyCode, event)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
    if (isPageTurnKey(keyCode) && AppNativeModule.volumeKeysEnabled) {
      return true
    }
    return super.onKeyUp(keyCode, event)
  }

  private fun isPageTurnKey(keyCode: Int): Boolean =
      keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN

  private fun emitVolumeKey(keyCode: Int) {
    val context = (application as ReactApplication).reactHost?.currentReactContext ?: return
    val params =
        Arguments.createMap().apply {
          putString("direction", if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) "up" else "down")
        }
    context.getJSModule(RCTDeviceEventEmitter::class.java).emit("VolumeKey", params)
  }
}
