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

old fundamental competencies: 
const mockFundamentalCompetencies: FundamentalCompetency[] = [
    { id: 'FC1', name: 'Ética y Ciudadana', description: 'Actúa con autonomía, responsabilidad y respeto a los principios éticos y democráticos.', group: 'G3' },

    { id: 'FC2', name: 'Comunicativa', description: 'Expresa e interpreta conceptos, pensamientos, sentimientos y hechos de forma oral y escrita.', group: 'G1' },

    { id: 'FC3', name: 'Pensamiento Lógico, Creativo y Crítico', description: 'Elabora y argumenta sus juicios y opiniones, y aborda la realidad de forma reflexiva.', group: 'G2' },

    { id: 'FC4', name: 'Resolución de Problemas', description: 'Identifica y analiza problemas para generar soluciones efectivas y pertinentes.', group: 'G2' },

    { id: 'FC5', name: 'Científica y Tecnológica', description: 'Aplica el conocimiento científico y tecnológico para comprender y transformar la realidad.', group: 'G4' },

    { id: 'FC6', name: 'Ambiental y de la Salud', description: 'Adopta hábitos de vida saludable y actúa con responsabilidad ante el medio ambiente.', group: 'G4' },
    
    { id: 'FC7', name: 'Desarrollo Personal y Espiritual', description: 'Desarrolla una autoimagen equilibrada y una relación sana consigo mismo y con los demás.', group: 'G3' },