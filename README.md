# Bunker616

Lector de cómics/manga para servidores [Komga](https://komga.org), hecho con React Native (CLI, sin Expo). Interfaz inspirada en [Panels](https://www.panels.app/) (ver [`docs/DESIGN.md`](docs/DESIGN.md)).

## Funcionalidad (v1 / MVP)

- Login contra un servidor Komga (URL + email + contraseña, auth HTTP Basic), credenciales guardadas de forma segura con `react-native-keychain`.
- Navegación por pestañas: **Biblioteca** y **Ajustes**, al estilo de los lectores nativos de iOS.
- Biblioteca: filtro por biblioteca, buscador y grid de series con portada y badge de no-leídos.
- Series: lista de libros/capítulos con progreso de lectura.
- Lector: paginado horizontal (`react-native-pager-view`), zoom con pinch y doble tap, zonas táctiles (izquierda/derecha para pasar página, centro para mostrar/ocultar la barra), barra de progreso y guardado automático del progreso de lectura en el servidor.
- Tema claro/oscuro automático, siguiendo el del sistema.

No incluido todavía (fuera del alcance del MVP pedido): descargas offline, modo lectura RTL para manga, modo panel-a-panel, modo de doble página, ajustes de servidor múltiples.

## Documentación

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — estructura de carpetas, reglas de organización del código y por qué se eligieron.
- [`docs/DESIGN.md`](docs/DESIGN.md) — sistema de diseño (colores, tipografía, espaciado) y qué se tomó de Panels como referencia.

## Stack

- React Native CLI (bare, TypeScript)
- `@react-navigation/native` + `native-stack` + `bottom-tabs`
- `@tanstack/react-query` para fetching/cache
- `axios` como cliente HTTP
- `react-native-gesture-handler` + `react-native-reanimated` para el zoom del lector
- `react-native-pager-view` para el paginado
- `react-native-keychain` para guardar credenciales de forma segura
- `babel-plugin-module-resolver` para los alias de imports (`@app`, `@navigation`, `@features`, `@shared`)

## Estructura

Arquitectura feature-based + capa compartida — detalle completo en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

```
src/
  app/          Providers.tsx (composición de providers)
  navigation/   RootNavigator + tipos de rutas
  features/     auth, library, series, reader, settings
  shared/       api, components, theme, types, utils
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

Cada tag `vX.Y.Z` pusheado a `main` dispara `.github/workflows/release.yml`, que compila un APK release (`arm64-v8a`, minificado con R8) y lo adjunta automáticamente a un GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

También se puede lanzar manualmente desde la pestaña Actions (`workflow_dispatch`) sin crear un tag; en ese caso el APK queda como artefacto del run, sin adjuntarse a ningún Release.

La firma usa la keystore de debug incluida en el repo (`android/app/debug.keystore`), así que Android seguirá avisando de "desarrollador no verificado" al instalar — es el mismo APK que si lo compilaras en local, solo que generado en CI.

## Notas sobre la API de Komga

La app usa autenticación HTTP Basic en cada petición (no sesión/cookie), compatible con cualquier versión reciente de Komga sin necesidad de generar un API Key manualmente. Si tu servidor usa HTTP (no HTTPS) en tu red local, está habilitado el tráfico "cleartext" en Android para que funcione sin configuración adicional.

Si tu versión de Komga cambia algún endpoint (p. ej. `/api/v2/users/me`), ajusta `src/shared/api/komga.ts`.

## Flujo de trabajo (git)

- `main` — rama estable.
- `develop` — rama de trabajo para nuevas features; se abre PR a `main` cuando está listo.
