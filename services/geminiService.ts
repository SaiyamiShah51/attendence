
import { GoogleGenAI, Type } from "@google/genai";
import type { Quiz, QuizQuestion } from '../types';

// IMPORTANT: This key is exposed on the frontend ONLY for demonstration purposes.
// In a real application, this logic should be handled on a backend server to protect the API key.
const API_KEY = process.env.API_KEY; 

if (!API_KEY) {
  console.warn("Gemini API key not found. Quiz generation will not work. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const geminiService = {
  generateQuiz: async (content: string, difficulty: string, numQuestions: number): Promise<QuizQuestion[]> => {
    if (!API_KEY) {
      throw new Error("API key is not configured.");
    }
    
    const prompt = `Based on the following text, generate a quiz with ${numQuestions} multiple-choice questions. The difficulty level should be ${difficulty}. Each question must have exactly 4 options, and only one correct answer.

Text:
---
${content.substring(0, 30000)}
---

Return the quiz in the specified JSON format.
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionText: {
                      type: Type.STRING,
                      description: "The text of the question.",
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "An array of 4 possible answers.",
                    },
                    correctAnswerIndex: {
                      type: Type.INTEGER,
                      description: "The 0-based index of the correct answer in the 'options' array.",
                    },
                  },
                  required: ["questionText", "options", "correctAnswerIndex"]
                }
              }
            }
          }
        },
      });

      const jsonString = response.text.trim();
      const result = JSON.parse(jsonString);

      if (!result.questions || !Array.isArray(result.questions)) {
        throw new Error("Invalid response format from AI. Expected a 'questions' array.");
      }
      
      return result.questions as QuizQuestion[];

    } catch (error) {
      console.error("Error generating quiz with Gemini API:", error);
      throw new Error("Failed to generate quiz. The AI service might be unavailable or the content might be unsuitable.");
    }
  }
};
