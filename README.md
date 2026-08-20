<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xIyvUsQn8BwO7qxai2XHV1gqkbLPumO2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. Build the app:
   `npm run build`
5. Deploy the app:
   `npx firebase deploy --only hosting`
   `npx firebase deploy --only firestore:rules`
   `npx firebase deploy --only functions`


Script	Comando	Descripción
dev	vite	Inicia el servidor de desarrollo local.
build	vite build	Compila la aplicación para producción.
preview	vite preview	Previsualiza la build de producción localmente.
test	vitest	Ejecuta los tests unitarios.

test:ui	vitest --ui	Abre la interfaz gráfica de Vitest.

deploy:dev	firebase deploy --project dev --config firebase.

dev.json	Despliega todo (hosting, rules, etc.) al entorno de desarrollo (gen-lang-client...).

deploy:rules:dev	firebase deploy --only firestore:rules --project dev ...	Despliega solo las reglas de Firestore a desarrollo.
deploy:rules:prod	firebase deploy --only firestore:rules --project prod	Despliega solo las reglas de Firestore a producción.
deploy:web:beta	firebase deploy --only hosting:beta --project prod	Despliega el hosting al target beta (en el proyecto prod).
deploy:web:prod	firebase deploy --only hosting:pro --project prod	Despliega el hosting al target pro (producción final).

## Documentation

See the `docs/` directory for detailed documentation:
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & roadmap
- [CHANGELOG.md](docs/CHANGELOG.md) — Version history
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Deployment instructions
- [OFFLINE_STRATEGY.md](docs/OFFLINE_STRATEGY.md) — Offline-first strategy
