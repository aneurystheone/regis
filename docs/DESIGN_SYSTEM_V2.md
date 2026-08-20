# Regis Design System V2 (Premium Aesthetic)

Este documento recoge los lineamientos visuales, utilidades de Tailwind CSS, y componentes de animación basados en la estética moderna utilizada en el *Onboarding Wizard* y modales recientes (V2) de la aplicación. 
El objetivo es mantener consistencia en las futuras implementaciones y refactorizaciones de interfaz.

## 1. Patrones Estructurales y Capas

### Contenedores y Modales (Glassmorphism)
Los modales modernos utilizan un fondo borroso oscuro y una tarjeta translúcida para generar profundidad (Efecto Glass/Cristal):
- **Capa Exterior (Backdrop):** `bg-slate-900/40 backdrop-blur-sm`
- **Capa Interior (Modal/Card base):** `bg-neutral-50 dark:bg-slate-900 rounded-3xl shadow-2xl`
- **Desbordamiento:** Siempre acompañado de `overflow-hidden` o contenedores de sub-scroll para contenido largo.

### Tarjetas Interiores e Inputs
- **Superficies por defecto:** `bg-white dark:bg-slate-800` con bordes suaves `border border-slate-100 dark:border-slate-700` y esquinas redondeadas exageradas `rounded-2xl` o `rounded-xl`.
- **Estados Focus/Activos:** Anillos sutiles `focus:ring-2 focus:ring-indigo-500` con `outline-none`.
- **Shadows:** Uso de `shadow-sm` para tarjetas internas incrustadas, y `shadow-lg` o `shadow-2xl` para contenedores "flotantes" importantes.

## 2. Paleta de Colores y Tipografía

### Colores de Sistema
En Regis V2, utilizamos colores vibrantes acompañados de tonos pasteles semitransparentes (opacidad en fondos oscuros):
*   **🔵 Primario (Indigo):** Base para CTAs y acentos principales. `indigo-600` (texto/solido) / `indigo-50` o `indigo-900/30` para fondos suaves.
*   **🟢 Éxito / Datos (Emerald):** Para finalizar flujos o denotar stats positivos. `emerald-600` / `emerald-100` o `emerald-900/30`.
*   **🟡 Advertencias / Offline (Amber):** Típicamente usado en la instalación PWA o notificaciones de conectividad. `amber-600` / `amber-100`.
*   **🟣 Formularios / Agrupaciones (Purple):** `purple-600` / `purple-100`.

### Textos y Tipografía
- **Títulos Grandes (H1/H2):** Siempre en `font-bold` o `font-black` aplicando tonalidades `text-slate-900 dark:text-white`. Utilizar `text-2xl` o `text-3xl`.
- **Subtítulos y Metadatos:** `text-sm font-medium` acompañado de colores menos dominantes `text-slate-500 dark:text-slate-400`.
- **Labels (Mayúsculas Pequeñas):** `text-xs font-bold uppercase tracking-widest` para títulos de Inputs y mini-secciones.

## 3. Botones y Llamados a la Acción (CTAs)

### Botones Primarios (Acción Principal)
Los botones principales ocupan un área generosa (Py, Px) e incorporan retroalimentación visual al hacer click/hover:
```html
<button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50">
    Continuar
</button>
```

### Botones Secundarios o Fantasmas (Volver / Cancelar)
Mantenemos el minimalismo con transiciones de color usando íconos acompañantes:
```html
<button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1 text-sm font-medium">
    <ChevronLeft className="w-4 h-4" /> Volver
</button>
```

### Contenedores de Íconos Decorativos
Para agregar modernidad a los encabezados, los íconos (Lucide) se encierran en "burbujas" cuadradas redondeadas:
```html
<!-- Ejemplo Tema Primario -->
<div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
    <User className="text-indigo-600 w-6 h-6" />
</div>
```

## 4. Animaciones y Motion (Framer Motion)

Regis V2 hace de `framer-motion` (/motion/react) el núcleo de su suavidad. Aquí agrupamos los pre-sets estándar.

### Montaje Base (Entrada de un componente principal/modal):
Las tarjetas grandes no aparecen de golpe, sino que suben ligeramente usando curvas tipo "Spring/Elastic".
```javascript
<motion.div
    initial={{ opacity: 0, y: 20, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
>
    {/* Contenido Modal */}
</motion.div>
```

### Pequeños Listados / Ítems nuevos
Para cargar pequeñas filas de la IU dentro de un contenedor:
```javascript
<motion.div 
    initial={{ opacity: 0, y: 10 }} 
    animate={{ opacity: 1, y: 0 }} 
    className="..."
>
    {/* Lista */}
</motion.div>
```

### Micro-Interacciones de Carga e Indicadores
Iconos que requieran sensación de asincronía (loaders, procesando la IA):
```html
<!-- Loader de SPINNER suave de Lucide-React -->
<Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto" />

<!-- Efectos Púlsares Suaves (Tailwind Mnativo) -->
<p className="animate-pulse">Vicente está leyendo tu horario...</p>

<!-- Rebotes Infinitos (Framer Motion) para avatares estáticos -->
<motion.div
    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
    transition={{ repeat: Infinity, duration: 2 }}
    className="..."
/>
```

## 5. Wizard / Stepper Pattern (Instrument Modals)

Instrument modals (`AddInstrumentModal`, `EditInstrumentModal`) use a **3-step wizard** with an inline stepper, replacing single-page long-scroll forms.

### Stepper Component
The stepper renders numbered circles with connecting bars. Completed steps show a checkmark, the active step has a blue border, and future steps are grayed.

```tsx
// Stepper usage (inline in header)
<Stepper current={step} />

// State management
const [step, setStep] = useState(1);
const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
```

### Slide Transitions (CSS, no framer-motion)
Steps animate using Tailwind's `animate-in` utility:
```tsx
const slideClass = slideDir === 'right'
  ? 'animate-in slide-in-from-right-4 duration-300'
  : 'animate-in slide-in-from-left-4 duration-300';
```

### Form Submission — No `<form>` Wrapper
**Critical**: The wizard does NOT wrap content in `<form>`. This prevents the browser's implicit form submission (hitting Enter in an input or clicking a `type="submit"` button) from prematurely closing the modal during intermediate steps.

Instead, the final step's save button is:
```tsx
<button type="button" onClick={handleSubmit}>Guardar</button>
```

### Date Format Convention
Date fields display as `dd/mm/yyyy` using text inputs with calendar icon:
```tsx
const toDisplay = (iso: string) => { /* YYYY-MM-DD → DD/MM/YYYY */ };
const toISO = (display: string) => { /* DD/MM/YYYY → YYYY-MM-DD */ };
```

---

*Nota: Ante cualquier creación de nuevo componente o refactorización de modales del "Legacy", seguir los lineamientos descritos arriba para garantizar paridad visual (Ejemplo base actual: `OnboardingWizard` o `AddInstrumentModal`).*
