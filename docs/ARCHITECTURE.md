# Arquitectura

Bunker616 sigue una estructura **híbrida feature-based**: cada pantalla/flujo vive
en su propia carpeta bajo `src/features/`, y todo lo que es realmente
transversal (API, tipos, componentes genéricos, theming, utilidades) vive en
`src/shared/`. Es el enfoque que recomienda la mayoría de guías de arquitectura
de React Native actuales para apps de tamaño pequeño-mediano: ni todo en
`components/screens/` plano (no escala), ni un monorepo con Nx/Turborepo
(sobra para este tamaño de app).

```
src/
  app/
    Providers.tsx       # composición de providers (gestos, safe area, theme,
                         # react-query, auth) — mantiene App.tsx trivial
  navigation/
    RootNavigator.tsx   # Stack raíz (Tabs / Series / Reader)
    types.ts            # tipos de params de cada navigator
  features/
    auth/                # login, contexto de sesión, Keychain
    library/             # pantalla de biblioteca + grid de series
    series/               # pantalla de detalle de serie + lista de libros
    reader/               # lector de páginas, zoom, progreso
    settings/             # ajustes, cerrar sesión
  shared/
    api/                 # cliente axios + llamadas REST a Komga
    components/          # UI genérica reutilizable (CoverImage, Badge, EmptyState)
    theme/               # design tokens + ThemeProvider (ver docs/DESIGN.md)
    types/               # tipos de las entidades de Komga
    utils/               # utilidades sin dependencias de UI (base64, ...)
```

## Reglas que se siguen

1. **Un feature no importa los internals de otro feature.** Si `reader`
   necesita algo de `series`, esa pieza se sube a `shared/`. Los imports entre
   features solo deberían darse a través del `index.ts` público de cada
   carpeta (barrel export), nunca a una ruta interna.
2. **La lógica de negocio vive en hooks, no en componentes.** Por ejemplo,
   `features/reader/hooks/useReaderProgress.ts` encapsula la mutación de
   progreso de lectura; `ReaderScreen` solo la consume. Esto hace la lógica
   testeable sin montar la UI.
3. **Algo pasa a `shared/` solo cuando lo usan 2+ features.** `CoverImage` lo
   usan `library` y `series`, así que vive en `shared/components`. Evita
   mover cosas "por si acaso" — eso es decision fatigue sin beneficio real.
4. **Alias de imports** (`@app`, `@navigation`, `@features`, `@shared`,
   configurados en `tsconfig.json` + `babel.config.js` vía
   `babel-plugin-module-resolver`) en vez de rutas relativas largas
   (`../../../shared/api/client`). Dentro de un mismo módulo (p. ej. entre
   `shared/api/client.ts` y `shared/types/komga.ts`) se mantienen las rutas
   relativas, ya que son vecinos directos.
5. **Tipos de navegación compuestos cuando hace falta.** `LibraryScreen` vive
   dentro de un `Tab.Navigator`, pero necesita navegar a `Series`, que vive un
   nivel arriba en el `Stack.Navigator` raíz. Para eso existe
   `LibraryScreenProps` en `navigation/types.ts`, combinando
   `BottomTabScreenProps` + `NativeStackScreenProps` con `CompositeScreenProps`
   de `@react-navigation/native`.

## Por qué no se usó Atomic Design ni Clean Architecture

Ambos son razonables para proyectos más grandes o con equipos más numerosos,
pero añaden capas (`atoms/molecules/organisms`, `domain/usecases/repositories`)
que no aportan nada en una app de este tamaño con un único desarrollador y un
dominio simple (un cliente REST + un lector). La regla de "sube a `shared/`
solo cuando lo usen 2+ sitios" ya evita la duplicación sin la ceremonia extra.

## Navegación

```
RootNavigator (Stack)
 ├─ Tabs (Bottom Tabs)
 │   ├─ LibraryTab → LibraryScreen
 │   └─ SettingsTab → SettingsScreen
 ├─ Series   (push desde LibraryScreen)
 └─ Reader   (push desde SeriesScreen, pantalla completa)
```

`Series` y `Reader` viven en el Stack raíz, no dentro de los Tabs, para que
ocupen toda la pantalla (sin la barra de tabs) y se abran con la animación de
"push" nativa habitual al entrar a un detalle o al lector.
