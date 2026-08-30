# Sistema de Diseño — ShowcaseMX

## Filosofía (Innegociable)

**"Stealth Wealth Corporativo."**

- UI minimalista nivel Apple / Linear.app
- Modo oscuro puro. Cero modo claro.
- Cero clichés de startups: no cohetes, no ilustraciones infantiles, no gradientes neón
- Tipografías limpias y técnicas
- Silencioso, extremadamente rápido, sin adornos

La interfaz debe comunicar: *"Este software lo usan empresas serias."*

---

## Paleta de Colores

Usamos variables CSS de shadcn/ui mapeadas a tonos zinc/grafito/titanio de Tailwind.

### Fondos
| Token | Valor aprox | Uso |
|-------|------------|-----|
| `background` | `zinc-950` / `#09090b` | Fondo principal de la app |
| `card` | `zinc-900` / `#18181b` | Tarjetas, modales, panels |
| `muted` | `zinc-800` / `#27272a` | Fondos secundarios, hover states |

### Texto
| Token | Valor aprox | Uso |
|-------|------------|-----|
| `foreground` | `zinc-50` / `#fafafa` | Texto principal |
| `muted-foreground` | `zinc-400` / `#a1a1aa` | Texto secundario, labels |
| `zinc-600` | `#52525b` | Placeholders, metadata |

### Bordes
| Token | Uso |
|-------|-----|
| `border` | `white/[0.08]` — Bordes sutiles, casi invisibles |
| `white/[0.05]` | Bordes en inputs y elementos de fondo |

### Acciones
| Elemento | Estilo |
|----------|--------|
| CTA primario | `bg-zinc-100 text-zinc-900` — Blanco/titanio sobre oscuro |
| CTA secundario / Ghost | `text-zinc-300 hover:bg-zinc-800/50` |
| Destructivo | Rojo apagado, no brillante |

### Nunca usar
- Azules brillantes tipo `blue-500`
- Verdes lima o naranjas
- Gradientes arcoíris
- Sombras de colores (solo `shadow-black/50`)

---

## Tipografía

**Font principal:** Inter (Google Fonts via `next/font`)  
Variable CSS: `--font-sans`

```tsx
// En layout.tsx
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
```

### Escala tipográfica
| Uso | Clase Tailwind |
|-----|----------------|
| Título hero | `text-5xl md:text-7xl font-bold tracking-tight` |
| Título sección | `text-2xl font-semibold tracking-tight` |
| Subtítulo / tagline | `text-base text-muted-foreground` |
| Body | `text-sm leading-relaxed` |
| Label / metadata | `text-xs text-zinc-500` |
| Navbar links | `text-[13px] font-medium` |

---

## Componentes Clave

### Navbar
- Flotante (`fixed top-6`), no pegada al borde
- Forma de pastilla (`rounded-full`)
- Fondo: `bg-background/60 backdrop-blur-xl`
- Borde: `border border-white/[0.08]`
- Archivo: `src/components/navbar.tsx`

### Cards de Producto
- `bg-card border border-border rounded-xl`
- Hover: `hover:border-white/[0.15] transition-colors`
- Sin sombras de colores
- Padding: `p-5 md:p-6`

### Inputs / Search
- `bg-zinc-900 border border-zinc-800 rounded-2xl`
- Placeholder: `text-zinc-600`
- Focus: borde ligeramente más brillante, sin glow de colores

### Badges / Pills
- `rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs`
- Para estados: `approved` = borde verde apagado, `pending` = borde amarillo apagado

---

## Animaciones

- Cero rebotes o efectos "bouncy"
- Solo transiciones de opacidad: `transition-opacity duration-200`
- Hover en links/cards: `transition-colors duration-150`
- Fade-in de resultados de IA: `animate-in fade-in duration-300`

---

## Spacing

Usamos el sistema de espaciado estándar de Tailwind.
Máximo ancho del contenido principal: `max-w-6xl mx-auto`
Padding horizontal global: `px-4 md:px-6`
