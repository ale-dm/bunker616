# Bunker616

Lector de cómics/manga para servidores [Komga](https://komga.org), hecho con React Native (CLI, sin Expo).

## Funcionalidad (v1 / MVP)

- Login contra un servidor Komga (URL + email + contraseña, auth HTTP Basic), credenciales guardadas de forma segura con `react-native-keychain`.
- Librería: lista de bibliotecas, grid de series con portada y buscador.
- Series: lista de libros/capítulos con progreso de lectura.
- Lector: paginado horizontal (`react-native-pager-view`), zoom con pinch y doble tap, zonas táctiles (izquierda/derecha para pasar página, centro para mostrar/ocultar la barra), y guardado automático del progreso de lectura en el servidor.

No incluido todavía (fuera del alcance del MVP pedido): descargas offline, modo lectura RTL para manga, modo de doble página, ajustes de servidor múltiples.

## Stack

- React Native CLI (bare, TypeScript)
- `@react-navigation/native` + `native-stack`
- `@tanstack/react-query` para fetching/cache
- `axios` como cliente HTTP
- `react-native-gesture-handler` + `react-native-reanimated` para el zoom del lector
- `react-native-pager-view` para el paginado
- `react-native-keychain` para guardar credenciales de forma segura
- `@react-native-async-storage/async-storage` (dependencia transitiva lista para futuro uso, p.ej. preferencias no sensibles)

## Estructura

```
src/
  api/        cliente axios + llamadas a la API REST de Komga
  auth/       AuthContext (login/logout, credenciales en Keychain)
  components/ CoverImage, SeriesGridItem, BookListItem, ZoomablePage
  navigation/ RootNavigator + tipos de rutas
  screens/    LoginScreen, LibraryScreen, SeriesScreen, ReaderScreen
  types/      tipos de las entidades de Komga
  utils/      base64 (para la cabecera Basic Auth, sin depender de Buffer/btoa)
```

## Requisitos para ejecutar

- Node 18+, un JDK 17/21 y Android Studio (SDK + emulador o un dispositivo) para Android.
- Para iOS: un Mac con Xcode (este proyecto no se puede compilar para iOS desde Linux).

## Primeros pasos

```bash
npm install

# Android (con un emulador corriendo o un dispositivo conectado)
npx react-native run-android

# iOS (solo en macOS)
cd ios && pod install && cd ..
npx react-native run-ios
```

## Releases (APK vía GitHub Actions)

Cada tag `vX.Y.Z` pusheado dispara `.github/workflows/release.yml`, que compila un APK release (`arm64-v8a`, minificado con R8) y lo adjunta automáticamente a un GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

También se puede lanzar manualmente desde la pestaña Actions (`workflow_dispatch`) sin crear un tag; en ese caso el APK queda como artefacto del run, sin adjuntarse a ningún Release.

La firma usa la keystore de debug incluida en el repo (`android/app/debug.keystore`), así que Android seguirá avisando de "desarrollador no verificado" al instalar — es el mismo APK que si lo compilaras en local, solo que generado en CI.

## Notas sobre la API de Komga

La app usa autenticación HTTP Basic en cada petición (no sesión/cookie), compatible con cualquier versión reciente de Komga sin necesidad de generar un API Key manualmente. Si tu servidor usa HTTP (no HTTPS) en tu red local, está habilitado el tráfico "cleartext" en Android para que funcione sin configuración adicional.

Si tu versión de Komga cambia algún endpoint (p. ej. `/api/v2/users/me`), ajusta `src/api/komga.ts`.
