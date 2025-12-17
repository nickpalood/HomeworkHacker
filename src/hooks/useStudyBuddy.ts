import { useState, useCallback, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { toast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
  type?: "normal" | "scolding"; // Type of message: normal conversation or phone detection scolding
}

interface UseHomeworkHackerOptions {
  personality?: "neutral" | "sarcastic";
  userName?: string;
}

const createSarcasticPrompt = (userName: string) => `You are a witty, knowledgeable study companion. Speak like a real person—plain conversational English, no special formatting, no asterisks. Help ${userName} learn with concise answers; humour should be dry and sometimes cruel, as if you are ${userName}'s closest friend. Prioritise straight‑forward guidance; only make sardonic remarks when they genuinely add insight. Focus on the material when analysing screenshots and comment on study habits only if it’s truly relevant. If screen context is needed but no screenshot is provided, answer what you can and end by asking, “Turn on screen recording?” so they can share more. Never describe the images themselves or summarise the content before answering.`;

const createNeutralPrompt = (userName: string) => `You are a supportive, patient study companion. Talk naturally and warmly—proper punctuation, no special formatting, no asterisks. Give concise yet thorough explanations that break topics into digestible parts, using relatable examples and acknowledging confusion. When reviewing screenshots, identify what ${userName} is working on and offer targeted help—be it concept explanations, study strategies or step‑by‑step guidance. If you need screen context and there’s no screenshot, respond normally and then ask, “Turn on screen recording?” so they can share more. Never describe what’s in the image or summarise before answering, and maintain an encouraging, human tone throughout`;

export function useHomeworkHacker(options: UseHomeworkHackerOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personality, setPersonality] = useState<"neutral" | "sarcastic">(
    options.personality ?? "neutral"
  );
  const userName = options.userName ?? "Student";
  const abortControllerRef = useRef<AbortController | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  // Initialize Gemini AI client
  if (!aiRef.current) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      aiRef.current = new GoogleGenAI({ apiKey });
    }
  }

  const sendMessage = useCallback(
    async (content: string, images?: string[] | null, overrideSystemInstruction?: string) => {
      console.log("[useHomeworkHacker] ========================================");
      console.log("[useHomeworkHacker] sendMessage() called");
      console.log("[useHomeworkHacker] Message content:", content.substring(0, 100));
      console.log("[useHomeworkHacker] Images provided:", images?.length || 0);
      console.log("[useHomeworkHacker] Override System Instruction provided:", !!overrideSystemInstruction);
      
      if (images) {
        images.forEach((image, index) => {
          const imageSizeKB = (image.length / 1024).toFixed(2);
          console.log(`[useHomeworkHacker] ✓ Image ${index + 1} size:`, imageSizeKB, "KB");
          console.log(`[useHomeworkHacker] Image ${index + 1} first 100 chars:`, image.substring(0, 100) + "...");
        });
      }
      
      if (!content.trim() && (!images || images.length === 0)) {
        console.log("[useHomeworkHacker] ⚠ No content and no images, returning early");
        console.log("[useHomeworkHacker] ========================================");
        return;
      }

      if (!aiRef.current) {
        console.error("[useHomeworkHacker] ✗ Gemini AI client not initialized");
        toast({
          title: "Error",
          description: "Gemini API key not configured",
          variant: "destructive",
        });
        return;
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim() || "Explain the concepts of what is shown in the images.",
        timestamp: new Date(),
        images: images || undefined,
      };

      console.log("[useHomeworkHacker] ✓ User message created:", userMessage.id);
      console.log("[useHomeworkHacker] Message has images:", !!userMessage.images?.length);
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();
        
        console.log("[useHomeworkHacker] Preparing Gemini request...");
        
        // Select system prompt based on personality and include user's name
        const finalSystemPrompt = overrideSystemInstruction || (
          personality === "sarcastic" 
            ? createSarcasticPrompt(userName) 
            : createNeutralPrompt(userName)
        );
        
        console.log("[useHomeworkHacker] Personality:", personality);
        console.log("[useHomeworkHacker] User name:", userName);
        console.log("[useHomeworkHacker] System prompt length:", finalSystemPrompt.length, "chars");
        console.log("[useHomeworkHacker] Request includes images:", !!images?.length);

        // Build content parts for Gemini
        const contentParts: any[] = [
          { text: content.trim() },
        ];

        if (images) {
          for (const image of images) {
            // Extract base64 from data URL
            const base64Data = image.split(",")[1];
            contentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            });
          }
          console.log(`[useHomeworkHacker] ✓ ${images.length} images added to Gemini request`);
        }

        const assistantId = crypto.randomUUID();
        console.log("[useHomeworkHacker] ✓ Assistant message ID created:", assistantId);

        // Add empty assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
          },
        ]);

        console.log("[useHomeworkHacker] ► SENDING REQUEST TO GEMINI...");

        let assistantContent = "";
        let chunkCount = 0;

        // Use streaming API
        const response = await aiRef.current.models.generateContentStream({
          model: "gemini-2.5-flash-lite",
          contents: {
            role: "user",
            parts: contentParts,
          },
          config: {
            systemInstruction: finalSystemPrompt, // Use finalSystemPrompt here
            temperature: 1
          },
        });

        console.log("[useHomeworkHacker] ✓ Stream started, receiving chunks...");

        for await (const chunk of response) {
          if (abortControllerRef.current?.signal.aborted) {
            console.log("[useHomeworkHacker] Request aborted by user");
            break;
          }

          chunkCount++;
          const chunkText = chunk.text || "";
          if (chunkText) {
            assistantContent += chunkText;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            );
            console.log(`[useHomeworkHacker] Chunk ${chunkCount} received (${chunkText.length} chars)`);
          }
        }

        console.log("[useHomeworkHacker] ✓ Stream complete - received", chunkCount, "chunks");
        console.log("[useHomeworkHacker] ✓✓✓ AI RESPONSE COMPLETE ✓✓✓");
        console.log("[useHomeworkHacker] Total response length:", assistantContent.length, "chars");
        console.log("[useHomeworkHacker] ========================================");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.log("[useHomeworkHacker] Request aborted by user");
          return;
        }

        console.error("[useHomeworkHacker] ✗✗✗ ERROR IN SEND MESSAGE ✗✗✗");
        console.error("[useHomeworkHacker] Error:", error);
        console.error("[useHomeworkHacker] Error message:", (error as Error).message);
        console.log("[useHomeworkHacker] ========================================");
        toast({
          title: "Error",
          description: (error as Error).message || "Failed to get AI response",
          variant: "destructive",
        });

        // Remove the failed assistant message
        setMessages((prev) => prev.filter((m) => m.role !== "assistant" || m.content));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [personality, userName]
  );

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // New function to send AI prompt without adding a user message to chat
  const sendAIPromptWithoutUserMessage = useCallback(
    async (content: string, images?: string[] | null, overrideSystemInstruction?: string, messageType: "normal" | "scolding" = "normal") => {
      console.log("[useHomeworkHacker] ========================================");
      console.log("[useHomeworkHacker] sendAIPromptWithoutUserMessage() called");
      console.log("[useHomeworkHacker] Message type:", messageType);
      console.log("[useHomeworkHacker] Prompt content:", content.substring(0, 100));
      console.log("[useHomeworkHacker] Images provided:", images?.length || 0);
      console.log("[useHomeworkHacker] Override System Instruction provided:", !!overrideSystemInstruction);

      if (!content.trim() && (!images || images.length === 0)) {
        console.log("[useHomeworkHacker] ⚠ No content and no images for AI prompt, returning early");
        console.log("[useHomeworkHacker] ========================================");
        return;
      }

      if (!aiRef.current) {
        console.error("[useHomeworkHacker] ✗ Gemini AI client not initialized for sendAIPromptWithoutUserMessage");
        toast({
          title: "Error",
          description: "Gemini API key not configured",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);

      try {
        abortControllerRef.current = new AbortController();

        console.log("[useHomeworkHacker] Preparing Gemini request for AI-only prompt...");

        const finalSystemPrompt = overrideSystemInstruction || (
          personality === "sarcastic"
            ? createSarcasticPrompt(userName)
            : createNeutralPrompt(userName)
        );

        console.log("[useHomeworkHacker] Personality (for AI-only prompt):", personality);
        console.log("[useHomeworkHacker] User name (for AI-only prompt):", userName);
        console.log("[useHomeworkHacker] System prompt length (for AI-only prompt):", finalSystemPrompt.length, "chars");
        console.log("[useHomeworkHacker] Request includes images (for AI-only prompt):", !!images?.length);

        const contentParts: any[] = [
          { text: content.trim() },
        ];

        if (images) {
          for (const image of images) {
            const base64Data = image.split(",")[1];
            contentParts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            });
          }
          console.log(`[useHomeworkHacker] ✓ ${images.length} images added to AI-only Gemini request`);
        }

        const assistantId = crypto.randomUUID();
        console.log("[useHomeworkHacker] ✓ Assistant message ID created for AI-only prompt:", assistantId);

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            type: messageType,
          },
        ]);

        console.log("[useHomeworkHacker] ► SENDING AI-ONLY REQUEST TO GEMINI...");

        let assistantContent = "";
        let chunkCount = 0;

        const response = await aiRef.current.models.generateContentStream({
          model: "gemini-2.5-flash-lite",
          contents: {
            role: "user",
            parts: contentParts,
          },
          config: {
            systemInstruction: finalSystemPrompt,
            temperature: 1
          },
        });

        console.log("[useHomeworkHacker] ✓ Stream started for AI-only prompt, receiving chunks...");

        for await (const chunk of response) {
          if (abortControllerRef.current?.signal.aborted) {
            console.log("[useHomeworkHacker] Request for AI-only prompt aborted by user");
            break;
          }

          chunkCount++;
          const chunkText = chunk.text || "";
          if (chunkText) {
            assistantContent += chunkText;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: assistantContent } : m
              )
            );
            console.log(`[useHomeworkHacker] Chunk ${chunkCount} received for AI-only prompt (${chunkText.length} chars)`);
          }
        }

        console.log("[useHomeworkHacker] ✓ Stream complete for AI-only prompt - received", chunkCount, "chunks");
        console.log("[useHomeworkHacker] ✓✓✓ AI-ONLY RESPONSE COMPLETE ✓✓✓");
        console.log("[useHomeworkHacker] Total response length for AI-only prompt:", assistantContent.length, "chars");
        console.log("[useHomeworkHacker] ========================================");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          console.log("[useHomeworkHacker] AI-only prompt request aborted by user");
          return;
        }

        console.error("[useHomeworkHacker] ✗✗✗ ERROR IN sendAIPromptWithoutUserMessage ✗✗✗");
        console.error("[useHomeworkHacker] Error:", error);
        console.error("[useHomeworkHacker] Error message:", (error as Error).message);
        console.log("[useHomeworkHacker] ========================================");
        toast({
          title: "Error",
          description: (error as Error).message || "Failed to get AI response for AI-only prompt",
          variant: "destructive",
        });

        // Remove the failed assistant message
        setMessages((prev) => prev.filter((m) => m.role !== "assistant" || m.content));
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [personality, userName]
  );

  // DEBUG: Add mock AI response without using API
  const sendMockMessage = useCallback(
    (userContent: string) => {
      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: userContent,
          timestamp: new Date(),
        },
      ]);

      // Simulate AI response after delay
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "This is a mock response generated for testing purposes.",
            timestamp: new Date(),
            type: "normal",
          },
        ]);
      }, 500);
    },
    []
  );

  return {
    messages,
    isLoading,
    personality,
    setPersonality,
    sendMessage,
    sendAIPromptWithoutUserMessage, // Export the new function
    sendMockMessage, // Export debug function
    cancelRequest,
    clearMessages,
  };
}
