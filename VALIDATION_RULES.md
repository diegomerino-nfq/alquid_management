# Reglas de Validación JSON - ALQUID Data Suite

## Archivos Involucrados

### 1. **types.ts** - Definición de Bases de Datos y Tablas Esperadas

Este archivo contiene dos estructuras principales:

#### EXPECTED_DATABASES
Una estructura jerárquica que define qué bases de datos son válidas para cada combinación de:
- **Cliente** (Banca March, Bankinter, BBVA, Pichincha)
- **Geografía** (opcional, según cliente)
- **Entorno** (PRE o PRO)

#### EXPECTED_TABLES (NUEVO)
Una estructura que mapea cada base de datos con sus tablas conocidas:
```typescript
export const EXPECTED_TABLES: Record<string, string[]> = {
  "DEFAULT": ["metric", "cashflow", "result", "accounts", "transactions", ...],
  "pre_bbva_argenti_alquid_xua": ["metric", "cashflow", "result", "accounts", ...],
  // ... más bases de datos
}
```

**Propósito:** Permite que la validación de referencias SQL sea context-aware, diferenciando entre:
- `cashflow.payment_date` → ✅ Referencia a tabla conocida (columna)
- `alquid.cashflow` → ❌ Referencia absoluta (necesita %s.%s)



---

## Reglas de Validación en utils/jsonValidator.ts

### SECCIÓN 1: ESTRUCTURA DEL ARCHIVO

#### Rule 1: Estructura Top-Level
- **Severity:** CRITICAL
- **Condición:** El JSON debe ser un array en el nivel superior
- **Mensaje:** "El archivo debe contener un array JSON en el nivel superior"
- **Lógica:** `if (!Array.isArray(data))`

#### Rule 2: Array No Vacío
- **Severity:** CRITICAL
- **Condición:** El array de informes no está vacío
- **Mensaje:** "El array de informes está vacío"
- **Lógica:** `if (data.length === 0)`

---

### SECCIÓN 2: VALIDACIÓN DE INFORMES

#### Rule 3: Objeto Informe Válido
- **Severity:** CRITICAL
- **Condición:** Cada elemento del array es un objeto válido
- **Mensaje:** "El elemento #X no es un objeto válido"
- **Lógica:** `if (!report || typeof report !== 'object')`

#### Rule 3b: Campo "report" Obligatorio
- **Severity:** CRITICAL
- **Condición:** El campo `report` (nombre del informe) existe y no está vacío
- **Mensaje:** "Falta el campo 'report' (nombre del informe)"
- **Lógica:** `if (!report.report || typeof report.report !== 'string')`

#### Rule 15: Nombres de Informes Únicos
- **Severity:** WARNING
- **Condición:** No hay nombres de informe duplicados
- **Mensaje:** "Nombre de informe duplicado: 'nombre'"
- **Lógica:** Se verifica contra un Set de nombres ya vistos (case-insensitive)

#### Rule 4: Array de Queries
- **Severity:** CRITICAL (si no es array) / ERROR (si está vacío)
- **Condición:** El campo `queries` es un array no vacío
- **Mensajes:** 
  - "El campo 'queries' debe ser un array"
  - "El informe no contiene queries"
- **Lógica:** `if (!Array.isArray(report.queries)) ... if (report.queries.length === 0)`

---

### SECCIÓN 3: VALIDACIÓN DE QUERIES (CAMPOS REQUERIDOS)

#### Rule 5: Campo SQL
- **Severity:** CRITICAL
- **Condición:** El campo `sql` existe, es string y no está vacío
- **Mensaje:** "El campo 'sql' está vacío o no es un string"
- **Lógica:** `if (!query.sql || typeof query.sql !== 'string')`

#### Rule 6: Filename
- **Severity:** ERROR
- **Condiciones:**
  1. El field `filename` existe y no está vacío
  2. El `filename` no contiene barras "/"
- **Mensajes:**
  - "El campo 'filename' está vacío"
  - "El filename no debe contener '/':"
- **Lógica:** 
  ```typescript
  if (!query.filename || typeof query.filename !== 'string')
  if (query.filename.includes('/'))
  ```

#### Rule 7: Database
- **Severity:** ERROR
- **Condición:** El campo `database` existe y no está vacío
- **Mensaje:** "El campo 'database' está vacío"
- **Lógica:** `if (!query.database || typeof query.database !== 'string')`

#### Rule 8: Table
- **Severity:** ERROR
- **Condiciones:**
  1. El campo `table` existe
  2. El valor de `table` es uno de: "metric", "cashflow", "result" (case-insensitive)
- **Mensajes:**
  - "El campo 'table' está vacío"
  - "Tabla 'nombre' no es válida. Debe ser: metric, cashflow o result"
- **Lógica:**
  ```typescript
  const validTables = ['metric', 'cashflow', 'result'];
  if (!validTables.includes(query.table.toLowerCase()))
  ```

---

### SECCIÓN 4: VALIDACIÓN DE BASE DE DATOS

#### Rule 9: Database Permitida para Cliente/Geografía/Entorno
- **Severity:** ERROR
- **Condición:** El valor de `database` está en la lista EXPECTED_DATABASES para la combinación cliente/geografía/entorno
- **Mensaje:** "BD 'nombre' no está permitida para cliente/entorno. Permitidas: [lista]"
- **Lógica:**
  ```typescript
  const allowedDbs = EXPECTED_DATABASES[client]?.[geography]?.[env];
  if (allowedDbs && !allowedDbs.includes(query.database))
  ```

**⚠️ NOTA IMPORTANTE:** Esta es la validación principal de bases de datos. Verifica que:
- Si se sube con cliente=BBVA, geografía=Argentina, entorno=PRE
- El `database` en la query DEBE ser uno de:
  - "pre_bbva_argenti_alquid_archive_xua"
  - "pre_bbva_argenti_alquid_xua"

---

### SECCIÓN 5: VALIDACIÓN DE SQL

#### Rule 10: Placeholder :load_id
- **Severity:** WARNING
- **Condición:** La SQL contiene el placeholder `:load_id`
- **Mensaje:** "La SQL no contiene el placeholder ':load_id'"
- **Lógica:** `if (!query.sql.includes(':load_id'))`

#### Rule 11: Referencias Absolutas (MEJORADO - En Producción)
- **Severity:** WARNING
- **Condición:** Detecta referencias dotadas en contextos FROM/JOIN que no son válidas
- **Mensaje:** "SQL contiene X referencia(s) absoluta(s) que necesitan %s.%s: [referencias]"
- **Bloquea Subida:** ❌ NO - Solo aviso informativo
- **Lógica:** Usa función `findAbsoluteReferences(query.sql, query.database)`

**✅ MECANISMO DE VALIDACIÓN:**

Este aviso es **informativo** para archivos que se están subiendo al repositorio:
- ⚠️ Detecta referencias absolutas potenciales en FROM/JOIN
- 📝 Se registran en el Activity Log como WARNING
- ✅ Permite que el archivo se suba igual (no bloquea)
- 🏷️ El archivo queda marcado para revisión posterior si es necesario

**Razón del Diseño:**
Los archivos subidos al repositorio ya han sido validados en el entorno de desarrollo, por lo que:
1. No bloqueamos sugerencias de mejora
2. Permitimos actualización de archivos existentes
3. Documentamos referencias que podrían mejorarse a dinámicas (`%s.%s`)
4. El usuario puede editar manualmente si desea (usando la herramienta QueryValidatorModal)

**Cómo Funciona (Context-Aware):**

La validación ahora es **context-aware** y considera:
1. **Alias de tabla:** Si un identificador es un alias definido en FROM/JOIN, se ignora
   - Detecta: `FROM table1 t1` → alias `t1`
   - Ignora: `t1.column` aunque sea dotado

2. **Tablas conocidas:** Si un identificador está en EXPECTED_TABLES para esa base de datos
   - Detecta tabla: `metric`, `cashflow`, `result`, etc.
   - Ignora: `metric.value`, `cashflow.payment_date`

3. **Base de datos actual:** Si la referencia usa la misma base de datos siendo validada
   - Ignora (es referencia local)

**Ejemplo Real:**
```sql
SELECT cashflow.payment_date 
FROM alquid.cashflow cashflow
WHERE load_id = :load_id
```

- ⚠️ Detecta: `alquid.cashflow` (database.table en FROM → podría ser %s.%s)
- ✅ Ignora: `cashflow.payment_date` (es alias de tabla)
- ✅ Ignora: `%s.%s` (ya es dinámico)
- **Resultado:** El archivo SE SUBE, pero con WARNING en el log



---

### SECCIÓN 6: VALIDACIÓN DE PARÁMETROS

#### Rule 12: Tipo de Parámetros
- **Severity:** WARNING
- **Condición:** El campo `parameters` es un objeto (si existe)
- **Mensaje:** "'parameters' debe ser un objeto, no [tipo]"
- **Lógica:** `if (typeof query.parameters !== 'object' || Array.isArray(query.parameters))`

#### Rule 13: Parámetros Tienen "value"
- **Severity:** WARNING
- **Condición:** Cada parámetro tiene un campo `value`
- **Mensaje:** "Parámetro 'nombre' no tiene campo 'value'"
- **Lógica:** 
  ```typescript
  Object.entries(query.parameters).forEach(([key, param]) => {
    if (!('value' in param))
  })
  ```

---

### SECCIÓN 7: VALIDACIÓN DE UNICIDAD Y REFERENCIAS

#### Rule 14: Filenames Únicos dentro del Informe
- **Severity:** WARNING
- **Condiciones:**
  1. No hay filenames duplicados dentro del mismo informe
  2. No hay filenames duplicados globalmente entre informes
- **Mensajes:**
  - "Filename duplicado dentro del informe"
  - "Filename duplicado con informe #X, query #Y"
- **Lógica:** Se usa un Set por informe + un Map global (case-insensitive)

#### Rule 16: Referencia a Tabla Correcta
- **Severity:** INFO
- **Condición:** La SQL solo referencia la tabla especificada en el campo `table`
- **Mensaje:** "La SQL referencia 'otra_tabla.*' pero la tabla definida es 'tabla_especificada'"
- **Lógica:**
  ```typescript
  const otherTables = ['metric', 'cashflow', 'result'].filter(t => t !== table);
  for (const other of otherTables) {
    if (new RegExp(`\\b${other}\\.[a-zA-Z_]`).test(sql))
  })
  ```

---

## Función findAbsoluteReferences() - Mejorada

### Ubicación
`utils/jsonValidator.ts` - Línea ~197

### Propósito
Detecta referencias dotadas en SQL que deberían ser dinámicas (`%s.%s`)

### Mejoras Implementadas
1. **Database-Aware:** Recibe el database como parámetro para contexto
2. **Whitelist de Tablas:** Usa EXPECTED_TABLES para conocer tablas válidas
3. **Alias Recognition:** Extrae y reconoce alias de tabla del SQL
4. **Same-DB Exclusion:** Ignora referencias a la misma base de datos

### Lógica Mejorada
**Una referencia se marca como "absoluta" Si y SOLO SI:**
```
1. Aparece en contexto FROM/JOIN (ej: FROM database.table)
2. Y el primer parte NO es un alias(ej: FROM table t → alias 't')
3. Y el primer parte NO es tabla conocida (metric, cashflow, result...)
4. Y el primer parte NO es la misma BD siendo validada
```

### Parámetros
- `sql` (string): La SQL query a analizar
- `database` (string, opcional): El nombre de la base de datos para contexto

### Retorna
Array de referencias absolutas encontradas (ej: `["alquid.cashflow"]`)

### Ejemplo de Uso
```typescript
const absoluteRefs = findAbsoluteReferences(
  'SELECT * FROM alquid.cashflow WHERE id = 1',
  'pre_bbva_argenti_alquid_xua'
);
// Retorna: ['alquid.cashflow']
```

---

## Cambios Implementados - Estado de Producción

### ✅ Opción 2 Implementada: Whitelist de Tablas Conocidas

Se agregó una nueva estructura en `types.ts`:

**EXPECTED_TABLES**
```typescript
export const EXPECTED_TABLES: Record<string, string[]> = {
  "DEFAULT": [
    "metric", "cashflow", "result", "accounts", 
    "transactions", "balance", "movements", ...
  ],
  "pre_banca_march_luxemburgo_alquid": [...],
  "pre_bbva_argenti_alquid_xua": [...],
  // ... mapeo completo de todas las bases de datos
}
```

### Mejoras Integradas

1. **Database-Aware Validation**
   - La función `findAbsoluteReferences()` ahora recibe el database
   - Usa EXPECTED_TABLES para consultar tablas válidas

2. **Context-Sensitive Detection**
   - Distingue entre alias de tabla y referencias absolutas
   - Reconoce tablas conocidas internamente
   - Excluye referencias a la misma base de datos

3. **Precisión Mejorada**
   - ❌ Menos falsos positivos
   - ✅ Más precisión en detección real de problemas
   - ✅ Funciona con cualquier estructura de SQL

4. **Flujo No-Bloqueante en Repositorio**
   - Las referencias absolutas detectadas se registran como WARNING
   - ✅ El archivo se sube sin bloqueos
   - 🏷️ Se marca en el Activity Log para revisión posterior
   - El usuario puede editarlas manualmente si lo desea

### Validación Antes vs. Después

**ANTES:**
```
Query: SELECT cashflow.payment_date FROM alquid.cashflow
Resultado: ❌ MARCA cashflow.payment_date COMO ERROR (INCORRECTO)
          ❌ BLOQUEA la subida del archivo
```

**DESPUÉS:**
```
Query: SELECT cashflow.payment_date FROM alquid.cashflow
Resultado: ✅ SOLO marca alquid.cashflow COMO WARNING (CORRECTO)
          ✅ PERMITE la subida del archivo
          📝 Registra en Activity Log para revisión
```

---

## Resumen de Flujo de Validación

```
1. JSON Parseado ↓
2. ¿Es array? (Rule 1, 2) ↓
3. Para cada informe:
   ├─ ¿Válido? (Rule 3) ↓
   ├─ ¿Tiene nombre? (Rule 3b) ↓
   ├─ ¿Nombre único? (Rule 15) ↓
   ├─ ¿Tiene queries? (Rule 4) ↓
   └─ Para cada query:
      ├─ ¿Campos requeridos existen? (Rules 5-8) ↓
      ├─ ¿Database permitida? (Rule 9) ✓ CRÍTICA - BLOQUEA si falla
      ├─ ¿SQL tiene :load_id? (Rule 10) ⚠️ WARNING si no existe
      ├─ ¿SQL tiene referencias absolutas? (Rule 11) ℹ️ AVISO - NO BLOQUEA
      ├─ ¿Parámetros válidos? (Rules 12-13) ⚠️ WARNING si fallan
      ├─ ¿Filenames únicos? (Rule 14) ⚠️ WARNING si hay duplicados
      └─ ¿Tabla correcta? (Rule 16) ℹ️ INFO si hay referencias cruzadas
```

### Niveles de Severidad y Comportamiento

| Severidad | Símbolo | Bloquea Subida | Ejemplo | Acción |
|-----------|---------|---|---------|--------|
| CRITICAL | ❌ | SÍ | Archivo no es array | Rechaza y muestra error |
| ERROR | ⛔ | SÍ | Database no permitida | Rechaza y muestra error |
| WARNING | ⚠️ | NO | Falta :load_id | Avisa pero permite subida |
| INFO | ℹ️ | NO | Tabla cruzada | Solo informa |

### Comportamiento en el Repositorio

Cuando el usuario sube un archivo JSON:

1. **Referencias Absolutas Detectadas (Rule 11):** 
   - Se registra como WARNING en el Activity Log
   - El archivo se sube normalmente
   - Usuario ve el aviso en el log
   - Puede editarlas manualmente después si lo desea

2. **Errores Críticos (Database no permitida, campos faltantes, etc):**
   - Se muestra al usuario inmediatamente
   - La subida se rechaza
   - Usuario debe corregir el JSON antes de reintentar
