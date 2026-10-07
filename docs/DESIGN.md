# Sistema de diseño

La interfaz está inspirada en **[Panels](https://www.panels.app/)**, uno de
los lectores de Komga/Kavita más usados en iOS/Mac. No hay forma de replicar
su interfaz al píxel sin acceso a la app o a sus capturas reales (su web es
básicamente marketing y no expone medidas ni paleta exacta — ver fuentes al
final), así que en vez de copiar literalmente se adoptó **el mismo lenguaje
visual del que parte Panels: el de iOS nativo** (fondos agrupados, controles
de sistema, tipografía San-Francisco-like, tarjetas redondeadas con sombra
sutil). Esto es consistente con lo que describen su propia web y las fichas
de App Store: temas claro/oscuro, portadas como protagonistas del grid, y
navegación simple basada en pestañas.

## Decisiones tomadas

| Elemento Panels (según su web / App Store) | Cómo se tradujo aquí |
|---|---|
| Temas claro y oscuro | `ThemeProvider` sigue `useColorScheme()` del sistema — no hay toggle manual, como en la mayoría de apps iOS modernas |
| Portadas como elemento central del grid | Grid de 3 columnas, `aspectRatio 2/3`, sombra sutil + esquinas redondeadas (`shared/components/CoverImage`) |
| Progreso de lectura por serie/libro | Badge de no-leídos sobre la portada (`shared/components/Badge`) + barra de progreso en la lista de capítulos |
| Lector a pantalla completa con overlay | `ReaderScreen`: barras translúcidas arriba/abajo que aparecen/desaparecen al tocar el centro, con contador de página y barra de progreso |
| Navegación simple (Library / Settings) | Bottom tabs con 2 pestañas; `Series` y `Reader` se abren a pantalla completa sobre los tabs |

## Tokens

Todo vive en `src/shared/theme/` y se consume con `useTheme()`:

- **`colors.ts`** — paleta clara y oscura calcada de los colores de sistema de
  iOS (`systemBackground`, `secondarySystemBackground`, `label`,
  `secondaryLabel`, azul de acento `#007AFF` / `#0A84FF` en oscuro, etc.).
- **`typography.ts`** — escala equivalente a los *text styles* de iOS
  (Large Title 34/700, Title 22/700, Headline 17/600, Body 16/400, Subhead,
  Footnote, Caption).
- **`spacing.ts`** — escala de espaciado (4/8/12/16/24/32) y radios de borde
  (8/12/16/pill).

Ejemplo de uso:

```tsx
const { colors, spacing, typography } = useTheme();

<Text style={[typography.headline, { color: colors.label }]}>
  Título
</Text>
```

## Limitaciones conocidas / qué falta para parecerse más

- **Panel-by-panel** (el modo de lectura insignia de Panels, que muestra
  una viñeta a la vez con zoom automático) no está implementado — requeriría
  metadata de viñetas que Komga no expone igual.
- **Animación de "page curl"** al pasar página: fuera de alcance, es un
  efecto muy específico de Panels y no aporta a la lectura, solo estética.
- **Carpetas/subcarpetas personalizadas con color y candado**: Komga no tiene
  ese concepto (tiene bibliotecas + series + colecciones), así que no aplica
  tal cual.
- No hay vista de **Mac/escritorio** — esta app es solo móvil.

## Fuentes consultadas

- [panels.app](https://www.panels.app/) — página oficial (marketing, sin
  detalle visual exacto)
- [Panels - Comic Reader en App Store](https://apps.apple.com/app/panels-comic-reader/id1236567663)
- [Guía oficial de Komga para configurar Panels](https://komga.org/docs/guides/panels)
