<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/43153771-f92e-4a56-b330-961daa7ea2cd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Politica simple de ramas

Ramas activas:
- `produccion`: version estable en uso.
- `preproduccion`: rama de validacion para pruebas funcionales.
- `main`: rama tecnica de respaldo/sincronizacion.

Reglas:
1. Todo cambio nuevo se hace en `preproduccion`.
2. No se hacen commits directos en `produccion`, salvo hotfix urgente.
3. Cuando un cambio se valida en `preproduccion`, se hace PR `preproduccion` -> `produccion`.
4. Despues de pasar a `produccion`, se sincroniza `main` desde `produccion` para mantener historial alineado.

Flujo recomendado:
1. `git switch preproduccion`
2. Desarrollar y testear.
3. `git push`
4. Abrir PR `preproduccion` -> `produccion`.
5. Merge en GitHub.
6. `git switch main` y merge/rebase desde `produccion`.

Hotfix urgente en produccion:
1. Crear rama desde `produccion` (ej. `hotfix/login-timeout`).
2. Corregir, testear y abrir PR a `produccion`.
3. Replicar ese cambio en `preproduccion` para no perderlo en siguientes despliegues.
