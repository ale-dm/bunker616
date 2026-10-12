package com.comicreader

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.ActivityInfo
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Pequeño módulo nativo para lo que React Native no cubre: orientación de la
 * ventana, captura de las teclas de volumen y notificaciones locales.
 */
class AppNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /** true = solo horizontal (en cualquiera de los dos sentidos); false = orientación libre. */
  @ReactMethod
  fun setOrientationLock(landscapeOnly: Boolean) {
    val activity = reactContext.currentActivity ?: return
    activity.runOnUiThread {
      activity.requestedOrientation =
          if (landscapeOnly) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
          else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
  }

  /** Mientras está activo, MainActivity consume las teclas de volumen y las envía a JS. */
  @ReactMethod
  fun setVolumeKeysEnabled(enabled: Boolean) {
    volumeKeysEnabled = enabled
  }

  @ReactMethod
  fun showNotification(id: Int, title: String, body: String) {
    val manager = reactContext.getSystemService(NotificationManager::class.java) ?: return
    val launch = reactContext.packageManager.getLaunchIntentForPackage(reactContext.packageName)

    val builder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          manager.createNotificationChannel(
              NotificationChannel(CHANNEL_ID, "Nuevos números", NotificationManager.IMPORTANCE_DEFAULT),
          )
          Notification.Builder(reactContext, CHANNEL_ID)
        } else {
          Notification.Builder(reactContext)
        }

    builder
        .setSmallIcon(reactContext.applicationInfo.icon)
        .setContentTitle(title)
        .setContentText(body)
        .setAutoCancel(true)

    if (launch != null) {
      builder.setContentIntent(
          PendingIntent.getActivity(
              reactContext,
              id,
              launch,
              PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          ),
      )
    }
    manager.notify(id, builder.build())
  }

  companion object {
    const val NAME = "AppNative"
    private const val CHANNEL_ID = "new-issues"

    @Volatile
    var volumeKeysEnabled = false
  }
}
