# Guía de Formato y Arquitectura — plantillasalquid

## 1. Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Bundler** | Vite | 8.x |
| **Frontend** | React (JSX) | 18+ (via CDN/Vite) |
| **Estilos** | TailwindCSS | 3.4.x |
| **Routing** | react-router-dom | 7.x |
| **HTTP (login)** | axios | 1.x |
| **HTTP (páginas)** | `authFetch` (wrapper de `fetch`) | custom |
| **Backend** | FastAPI (Python) + Uvicorn | — |
| **Auth** | JWT + TOTP (2FA) | PyJWT + pyotp |

> [!IMPORTANT]
> No se usa TypeScript en los componentes aunque hay un `tsconfig.json`. Todos los archivos de componentes son `.jsx`.

---

## 2. Estructura de Archivos

```
proyecto/
├── api/
│   └── main.py                    # Backend FastAPI (todos los endpoints)
├── frontend/
│   ├── index.html                 # Entry point HTML
│   ├── package.json               # Dependencias npm
│   ├── tailwind.config.js         # Paleta de colores "nafra-*"
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx               # Monta <App/> en #root
│       ├── App.jsx                # Router principal + AuthProvider
│       ├── index.css              # Estilos globales + clases Tailwind custom
│       ├── components/
│       │   ├── Layout.jsx         # Sidebar + Navbar + <Outlet/>
│       │   ├── Sidebar.jsx        # Navegación lateral
│       │   ├── Navbar.jsx         # Breadcrumb + usuario + botones
│       │   ├── ProtectedRoute.jsx # Guard de autenticación
│       │   └── DataTable.jsx      # Tabla reutilizable (sort, search, paginación, edición inline)
│       ├── context/
│       │   └── AuthContext.jsx    # Provider de autenticación (login, verify2FA, logout)
│       ├── utils/
│       │   └── authFetch.js       # Wrapper de fetch() con token JWT
│       └── pages/
│           ├── LoginPage.jsx      # Página de login (fuera del Layout)
│           ├── HomePage.jsx       # Dashboard con tarjetas de módulos
│           ├── MarketDefPage.jsx  # Market Data Definitions (tabs + DataTable)
│           ├── BehaviorDefPage.jsx# Behavior Definitions (tabs + DataTable)
│           ├── MarketDataPage.jsx # Generador de Market Data (formulario por pasos)
│           ├── ModelPage.jsx      # Modelización (wizard multi-paso)
│           └── BehaviorDataPage.jsx # Behavior Data (configuración + generación)
└── run_app.bat                    # Lanza backend + frontend
```

---

## 3. Sistema de Diseño (Design Tokens)

### 3.1 Paleta de Colores

Todos los colores están definidos en `tailwind.config.js` bajo el prefijo `nafra-*`:

| Token | Hex | Uso |
|-------|-----|-----|
| `nafra-bg` | `#0a0f1a` | Fondo principal (body) |
| `nafra-surface` | `#0d1926` | Superficies secundarias |
| `nafra-card` | `#111b27` | Fondo de tarjetas |
| `nafra-card-hover` | `#162234` | Tarjeta al hover |
| `nafra-border` | `#1a2a3a` | Bordes normales |
| `nafra-border-light` | `#243447` | Bordes hover |
| `nafra-accent` | `#297cf2` | Color de acento principal (azul) |
| `nafra-accent-dim` | `#1e5fbd` | Acento oscuro |
| `nafra-text` | `#e8edf3` | Texto principal |
| `nafra-text-dim` | `#8899aa` | Texto secundario |
| `nafra-text-muted` | `#5a6a7a` | Texto terciario |
| `nafra-sidebar` | `#080d16` | Fondo sidebar |
| `nafra-danger` | `#e85d45` | Errores/eliminar |
| `nafra-warning` | `#ffb84d` | Advertencias |
| `nafra-success` | `#297cf2` | Éxito (azul) |

### 3.2 Tipografía

- **Sans**: `Inter`, system-ui, -apple-system, sans-serif
- **Mono**: `JetBrains Mono`, Fira Code, monospace
- Google Fonts: importado en `index.css` → `Inter:wght@300;400;500;600;700;800`

### 3.3 Clases CSS Reutilizables (index.css)

```css
/* Tarjetas con efecto glass */
.glass-card         → bg-nafra-card + border + rounded-xl + backdrop-blur
.metric-card        → glass-card + p-5 + glow sutil

/* Botones */
.btn-primary        → gradient azul, sombra, hover elevación
.btn-secondary      → borde, fondo surface, hover acento
.btn-danger         → borde rojo, texto rojo

/* Tabs */
.tab-item           → texto dim, hover claro
.tab-item.active    → texto acento + fondo acento/12 + bottom border

/* Formularios */
.input-field        → input oscuro, borde, focus azul glow
.select-field       → input-field + flecha SVG custom
.label-field        → texto xs, uppercase, tracking-wider, color dim

/* Badges */
.badge-success      → fondo azul/15, texto azul
.badge-warning      → fondo amarillo/15, texto amarillo
.badge-danger       → fondo rojo/15, texto rojo

/* Tablas */
.data-table         → border-collapse, sticky headers, hover rows
```

### 3.4 Animaciones

| Clase | Efecto |
|-------|--------|
| `animate-fade-in` | Aparición suave (opacity 0→1) |
| `animate-slide-up` | Desliza hacia arriba |
| `animate-slide-in-left` | Desliza desde la izquierda |
| `animate-pulse-subtle` | Pulsación sutil (escala) |

---

## 4. Arquitectura de Componentes

### 4.1 App.jsx — Router Principal

```jsx
<AuthProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />        {/* SIN Layout */}
      
      <Route element={<ProtectedRoute />}>                   {/* Guard JWT */}
        <Route element={<Layout />}>                          {/* Sidebar + Navbar */}
          <Route path="/" element={<HomePage />} />
          <Route path="/mi-nueva-ruta" element={<MiNuevaPagina />} />
          {/* ... más rutas */}
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```

### 4.2 Layout.jsx — Estructura de Página

```jsx
<div className="flex h-screen overflow-hidden bg-nafra-bg">
  <Sidebar />                           {/* w-60, fijo a la izquierda */}
  <div className="flex flex-col flex-1 overflow-hidden">
    <Navbar />                           {/* h-12, breadcrumb + user */}
    <main className="flex-1 overflow-y-auto p-6">
      <Outlet />                         {/* Aquí se renderiza la página */}
    </main>
  </div>
</div>
```

### 4.3 Sidebar.jsx — Navegación

La navegación se define como un array de secciones:

```jsx
const NAV_SECTIONS = [
  {
    title: 'NOMBRE SECCIÓN',           // Título uppercase
    collapsible: false,                  // true = colapsable
    items: [
      { label: 'Mi Página', path: '/mi-ruta', icon: 'chart' },
      // icon puede ser: 'chart', 'panel', 'analysis', 'strategy', 'compare', 'periods'
    ],
  },
]
```

**Para añadir una página al sidebar**: Agregar un item al array `items` con su `label`, `path` e `icon`.

### 4.4 Navbar.jsx — Breadcrumb

```jsx
const BREADCRUMBS = {
  '/': { section: 'PLANTILLAS ALQUID', page: 'Vista General' },
  '/mi-ruta': { section: 'PLANTILLAS ALQUID', page: 'Mi Nueva Página' },
}
```

### 4.5 AuthContext — Autenticación

```jsx
// Usar en cualquier componente:
const { user, loading, login, verify2FA, logout } = useAuth()
// user = { email: 'usuario@nfq.es' } | null
```

### 4.6 authFetch — Llamadas API autenticadas

```jsx
import authFetch from '../utils/authFetch'

// GET
const res = await authFetch('http://localhost:8000/api/mi-endpoint')
const data = await res.json()

// POST con JSON
const res = await authFetch('http://localhost:8000/api/mi-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: value }),
})

// POST con FormData (para archivos)
const formData = new FormData()
formData.append('file', file)
const res = await authFetch('http://localhost:8000/api/mi-endpoint', {
  method: 'POST',
  body: formData,   // NO poner Content-Type, el browser lo añade con boundary
})
```

> [!WARNING]
> **NUNCA usar `fetch()` directamente**. Siempre usar `authFetch` para que incluya el token JWT automáticamente.

### 4.7 DataTable — Tabla Reutilizable

```jsx
import DataTable from '../components/DataTable'

<DataTable
  columns={[
    { key: 'name', label: 'Nombre', editable: true },
    { key: 'type', label: 'Tipo', editable: true, options: ['A', 'B', 'C'] },
    { key: 'value', label: 'Valor', type: 'number', width: 80 },
  ]}
  data={arrayDeRegistros}
  onUpdate={(rowIndex, key, value) => { /* actualizar estado */ }}
  onDelete={(rowIndex) => { /* eliminar fila */ }}
  onClone={(rowIndex) => { /* clonar fila */ }}
  emptyMessage="No hay registros todavía."
/>
```

---

## 5. Patrón de una Página Típica

### 5.1 Página de Formulario (tipo MarketDataPage)

```jsx
import { useState, useEffect } from 'react'
import authFetch from '../utils/authFetch'

const API = 'http://localhost:8000/api/mi-modulo'

// Componente Toast (se repite en varias páginas)
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const colors = {
    success: 'border-nafra-accent bg-nafra-accent/10 text-nafra-accent',
    error: 'border-nafra-danger bg-red-900/10 text-nafra-danger',
    info: 'border-nafra-cyan bg-nafra-cyan/10 text-nafra-cyan',
  }
  return (
    <div className={`toast fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border ${colors[type]} text-sm font-medium shadow-nafra-lg flex items-center gap-2`}>
      <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      {message}
    </div>
  )
}

export default function MiNuevaPagina() {
  const [toast, setToast] = useState(null)
  const showToast = (message, type = 'success') => setToast({ message, type })

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-nafra-text">Título de la Página</h1>
        <p className="text-sm text-nafra-text-dim mt-0.5">Descripción breve</p>
      </div>

      {/* Sección / Paso con numeración */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-nafra-text flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-nafra-accent/15 text-nafra-accent text-xs font-bold flex items-center justify-center">1</span>
          Nombre del Paso
        </h2>
        {/* Contenido del paso */}
      </div>

      {/* Botón principal */}
      <button className="btn-primary flex items-center gap-2">
        Ejecutar
      </button>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
```

### 5.2 Página con Tabs + DataTable (tipo MarketDefPage)

```jsx
export default function MiPaginaConTabs() {
  const [activeTab, setActiveTab] = useState('tab1')
  const [data, setData] = useState({ tab1: [], tab2: [] })

  useEffect(() => {
    authFetch(`${API}/state`).then(r => r.json()).then(setData)
  }, [])

  const TABS = [
    { key: 'tab1', label: 'Pestaña 1' },
    { key: 'tab2', label: 'Pestaña 2' },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-nafra-border pb-px">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* DataTable del tab activo */}
      <DataTable
        columns={COLUMNS[activeTab]}
        data={data[activeTab]}
        onUpdate={...}
        onDelete={...}
        onClone={...}
      />
    </div>
  )
}
```

---

## 6. Patrón del Backend (api/main.py)

Todos los endpoints de un módulo siguen esta estructura CRUD:

```python
# Estado en memoria
mi_state = { "tab1": [], "tab2": [] }

# Endpoints protegidos con JWT
@app.get("/api/mi-modulo/state")
def get_state(current_user: str = Depends(get_current_user)):
    return mi_state

@app.post("/api/mi-modulo/add/{sheet}")
def add(sheet: str, record: dict[str, Any], current_user: str = Depends(get_current_user)):
    mi_state[sheet].append(record)
    return {"ok": True}

@app.delete("/api/mi-modulo/delete/{sheet}/{index}")
def delete(sheet: str, index: int, current_user: str = Depends(get_current_user)):
    mi_state[sheet].pop(index)
    return {"ok": True}

@app.put("/api/mi-modulo/update/{sheet}/{index}")
def update(sheet: str, index: int, updates: dict[str, Any], current_user: str = Depends(get_current_user)):
    for k, v in updates.items():
        mi_state[sheet][index][k] = v
    return {"ok": True}

@app.post("/api/mi-modulo/clone/{sheet}/{index}")
def clone(sheet: str, index: int, current_user: str = Depends(get_current_user)):
    cloned = copy.deepcopy(mi_state[sheet][index])
    mi_state[sheet].append(cloned)
    return {"ok": True}

@app.post("/api/mi-modulo/export")
def export(req: ExportRequest, current_user: str = Depends(get_current_user)):
    # Generar Excel con openpyxl y devolver como StreamingResponse
    ...

@app.post("/api/mi-modulo/import")
async def import_file(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    # Leer Excel, parsear filas, cargar en mi_state
    ...
```

> [!NOTE]
> Todos los endpoints requieren `Depends(get_current_user)` para la autenticación JWT.

---

## 7. Checklist para Crear una Nueva Página

### 7.1 Archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| `frontend/src/pages/MiNuevaPagina.jsx` | **CREAR** — Componente de la página |
| `frontend/src/App.jsx` | **MODIFICAR** — Añadir `import` + `<Route>` |
| `frontend/src/components/Sidebar.jsx` | **MODIFICAR** — Añadir item en `NAV_SECTIONS` |
| `frontend/src/components/Navbar.jsx` | **MODIFICAR** — Añadir breadcrumb en `BREADCRUMBS` |
| `frontend/src/pages/HomePage.jsx` | **MODIFICAR** (opcional) — Añadir tarjeta en `MODULES` |
| `api/main.py` | **MODIFICAR** — Añadir endpoints del nuevo módulo |

### 7.2 Instrucciones para el agente

Puedes copiar y adaptar este prompt:

---

> **Prompt para el agente:**
>
> Crea una nueva página llamada `[NombrePagina]Page` en la aplicación React existente. La aplicación usa:
>
> - **Vite + React (JSX)** con **TailwindCSS 3** y colores custom prefijo `nafra-*`
> - **authFetch** (`src/utils/authFetch.js`) para todas las llamadas API (wrapper de fetch con JWT)
> - **FastAPI** backend en `api/main.py` en `http://localhost:8000`
> - Clases CSS custom: `glass-card`, `btn-primary`, `btn-secondary`, `btn-danger`, `tab-item`, `input-field`, `select-field`, `label-field`, `badge-success`, `data-table`, `animate-fade-in`
> - Componente `DataTable` reutilizable en `src/components/DataTable.jsx` con props: `columns`, `data`, `onUpdate`, `onDelete`, `onClone`
> - Tema oscuro con fondo `#0a0f1a`, tarjetas `glass-card`, botones con gradient azul `#297cf2`
>
> **Pasos necesarios:**
> 1. Crear `frontend/src/pages/[NombrePagina]Page.jsx` siguiendo el patrón de las páginas existentes (header + secciones glass-card + Toast)
> 2. En `App.jsx`: importar y añadir `<Route path="/[ruta]" element={<[NombrePagina]Page />} />`dentro del grupo `<Route element={<Layout />}>`
> 3. En `Sidebar.jsx`: añadir `{ label: '[Label]', path: '/[ruta]', icon: '[icono]' }` en `NAV_SECTIONS`
> 4. En `Navbar.jsx`: añadir `'/[ruta]': { section: 'PLANTILLAS ALQUID', page: '[Label]' }` en `BREADCRUMBS`
> 5. (Opcional) En `HomePage.jsx`: añadir tarjeta en array `MODULES`
> 6. En `api/main.py`: añadir los endpoints necesarios protegidos con `Depends(get_current_user)`
>
> **Funcionalidad de la nueva página:** [describir aquí qué debe hacer]

---

## 8. Convenciones de Código

| Aspecto | Convención |
|---------|-----------|
| Archivos de página | `PascalCase` + sufijo `Page.jsx` |
| Imports | React hooks al inicio, luego authFetch, luego componentes |
| Estado | `useState` para estado local de formulario |
| API URL | Constante `const API = 'http://localhost:8000/api/...'` al inicio |
| Idioma UI | Español (labels, placeholders, toasts) |
| Iconos | SVGs inline (Heroicons outline, strokeWidth 1.5) |
| Notificaciones | Componente `Toast` local en cada página |
| Contenedor página | `max-w-5xl mx-auto space-y-6 animate-fade-in` (formulario) o `max-w-7xl` (tabla) |
| Secciones | `glass-card p-6 space-y-4` |
| Headers de sección | Número en circulo + título: `<span className="w-6 h-6 rounded-full bg-nafra-accent/15...">1</span>` |
| Exportación | `export default function NombrePagina()` |
