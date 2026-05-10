import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function detectLineage(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Analyze the following text describing a family relationship within the Hazi Bari descendants.
        Identify the child and the father mentioned. 
        Text: "${text}"

        Return the result in strictly valid JSON format with keys: "childName", "fatherName", "relationshipType".
        If no clear relationship is found, return null.
        Sample: {"childName": "Arfin", "fatherName": "Monir", "relationshipType": "son"}
      `,
    });
    const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Lineage Detection Error:", error);
    return null;
  }
}

export async function answerTreeQuestion(question: string, treeContext: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        You are the AI Bongsho (Lineage) Assistant for the Hazi Bari Foundation.
        Context of some family members: ${treeContext}
        
        Question: ${question}
        
        Answer concisely and respectfully in the context of family lineage. If you don't know, suggest they check the official records in the search bar.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("AI Tree Question Error:", error);
    return "I'm sorry, I couldn't process that question right now.";
  }
}

async function bufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buffer]);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function analyzeLineageImage(imageBuffer: ArrayBuffer, mimeType: string) {
  try {
    const base64Data = await bufferToBase64(imageBuffer);
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          text: `
            Objective: Analyze this identity document (e.g., NID, Passport, Birth Certificate, or School Certificate). 
            Extract detailed personal and family information.
            
            1. Extract the "Subject Name" (the owner of the ID).
            2. Extract columns for "Father's Name" and "Mother's Name".
            3. Extract "Village" (গ্রাম) and "District" (জেলা) from the address and ID details.
            4. Extract "NID Number" or "Voter ID Number" or "Certificate ID".
            5. Extract "House Name" (বাড়ির নাম) if available.
            6. If the document is in Bengali, provide the names in both English (transliterated) and Bengali.

            Return a structured JSON object:
            {
              "subject": { "name": "...", "nameBengali": "..." },
              "father": { "name": "...", "nameBengali": "..." },
              "mother": { "name": "...", "nameBengali": "..." },
              "village": "...",
              "district": "...",
              "nidNumber": "...",
              "house": "...",
              "summary": "Short description of extracted data",
              "confidence": 0.9
            }

            Constraint: If any specific field is NOT found, use NULL for that field. 
            Strictly return ONLY the JSON.
          `
        },
        {
          inlineData: {
            data: base64Data,
            mimeType
          }
        }
      ]
    });
    const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("AI Image Lineage Error:", error);
    return null;
  }
}

export async function refineBlogPost(content: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `
        Act as a professional Content Strategist and Editor for 'HAZIBARI FOUNDATION'. Your goal is to transform raw user input into a polished, high-quality blog post.

        ### Core Tasks:
        1. Grammar & Spell Check: Fix all spelling and syntax errors in Bengali or English.
        2. Structural Flow: Organize the text into logical sections with compelling Headings (H2, H3).
        3. Tone Consistency: Maintain a helpful, informative, and community-focused tone suitable for a foundation.
        4. Rich Formatting: 
           - Use **Bold** for emphasis on key points.
           - Use Bullet points for readability.
           - Suggest placeholders like "[Insert Image Here: Description]" where a visual would enhance the context.
        5. SEO Optimization: Naturally integrate relevant keywords and create a meta description (within 160 characters) for the post.
        6. Sentence Enhancement: Rewrite weak sentence structures to be more impactful and professional without changing the original intent.

        ### Output Style:
        - Professional Bengali (Standard/Suddho Bhasha) if input is Bengali.
        - Engaging and easy to read.

        ### Input Content to Refine:
        "${content}"
      `,
    });
    return response.text;
  } catch (error) {
    console.error("AI Content Refiner Error:", error);
    return null;
  }
}

export async function generatePostImage(content: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          text: `Create a professional, community-focused illustration or meaningful visual for a blog post from the Hazi Bari Foundation. 
          The image should capture the essence of this content: "${content.substring(0, 500)}".
          Style: High-quality 3D render, minimalist, warm lighting, professional community foundation theme.`,
        },
      ],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("AI Image Generation Error:", error);
    return null;
  }
}

export async function transcribeAudio(base64Audio: string, mimeType: string = "audio/webm") {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          text: `
            You are a high-speed Audio-to-Text specialist for a professional foundation communication tool.
            
            Objective: Provide a near-instant, highly accurate transcription of the spoken content.
            
            Language & Style:
            - Detect whether the speaker is using Bengali or English.
            - If Bengali: Transcribe strictly in Standard Bengali (Suddho Bhasha) script.
            - If English: Transcribe in clear, professional English.
            - If "Banglish": Convert it into proper, formal Bengali script.
            
            Formatting: 
            - Use accurate punctuation (দারি, কমা) to ensure readability within a chat bubble.
            - Maintain respectful and accurate tone consistent with a foundation's communication standards.
            
            Noise: Suppress background noise and focus exclusively on the primary speaker.
          `
        },
        {
          inlineData: {
            data: base64Audio.split(",")[1] || base64Audio,
            mimeType
          }
        }
      ],
    });
    return response.text;
  } catch (error) {
    console.error("AI Transcription Error:", error);
    return null;
  }
}

export async function explainFamilyTree(treeData: any, subjectName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        You are a genealogy expert for the Hazi Bari Foundation.
        Given the following family tree data (ancestors) for ${subjectName}:
        ${JSON.stringify(treeData)}

        Task:
        1. Explain the lineage and relationships clearly in Bengali.
        2. Mention parents, grandparents, and any further ancestors found.
        3. Make the description engaging and easy to understand for family members.
        4. Use respectful language (Standard Bengali/Suddho Bhasha).

        Return strictly the explanatory text in Bengali.
      `,
    });
    return response.text;
  } catch (error) {
    console.error("AI Tree Explanation Error:", error);
    return "দুঃখিত, এই মুহূর্তে সম্পর্কের ব্যাখ্যা তৈরি করা সম্ভব হচ্ছে না।";
  }
}
