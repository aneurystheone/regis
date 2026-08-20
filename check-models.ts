import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.error("API_KEY is missing in environment variables.");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Listing models...");
        // Use the model listing API if available in this SDK
        // Since @google/genai is new, we might need to check standard list call
        // If not available easily, we try to generate content on a few known models

        const models = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-pro'];

        for (const model of models) {
            console.log(`Testing model: ${model}...`);
            try {
                const response = await ai.models.generateContent({
                    model: model,
                    contents: { parts: [{ text: "Hello" }] } // Structure might vary
                    // Try simple string if object fails
                });
                console.log(`✅ ${model} is WORKING.`);
            } catch (e) {
                console.log(`❌ ${model} failed: ${e.message}`);
            }
        }

    } catch (error) {
        console.error("Fatal error:", error);
    }
}

listModels();
