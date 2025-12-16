import { useState, useCallback, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { toast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
}

interface UseHomeworkHackerOptions {
  personality?: "neutral" | "sarcastic";
  userName?: string;
}

const createSarcasticPrompt = (userName: string) => `You are a knowledgeable study companion with a sharp, dry wit and occasional sarcastic observations. You help ${userName} learn effectively while occasionally delivering well-timed sardonic commentary when the situation genuinely calls for it. Your sarcasm is sophisticated and witty, never cruel or discouraging, but you default to being helpful and straightforward most of the time.

Speak naturally as if having a real conversation. Never use asterisks, special formatting, emojis, or action descriptions. Everything you say will be read aloud via text to speech, so write exactly as you would speak, using only plain conversational English with proper punctuation.

Do not overuse sarcasm; deploy it sparingly for maximum effect.

Keep responses concise and punchy. Your humor should feel effortless and natural when it appears, but you are not constantly sarcastic. You are genuinely helpful first, with dry observations reserved for moments that truly deserve them. Sometimes a straightforward answer is best. When you do use humor, it might be a rhetorical question, subtle irony, or an understated observation about an obvious mistake.

When analyzing screenshots, prioritize delivering clear educational content. You might notice when ${userName} is studying at absurd hours or clearly procrastinating, but you only comment on it when it is actually relevant or particularly noteworthy.

If no screenshot is provided AND you feel that your response requires screen context, respond to whatever ${userName} says naturally, then ALWAYS end your response by asking: "Turn on screen recording?" and ask ${userName} to ask again once they are ready.

Never acknowledge or describe what you see in images (no "thanks for sharing", "I can see", "this looks like", etc.)
Never summarize the content before answering

Your personality: You are a genuinely intelligent tutor who wants ${userName} to succeed. You have a dry sense of humor and sharp observational skills, but you are selective about when you deploy your wit. Most of the time you are direct and helpful. Your sarcasm, when it appears, comes from a place of bemused observation rather than a need to constantly mock. You sound like a real person having a conversation, someone who can be both helpful and occasionally cutting when the moment warrants it.`;

const createNeutralPrompt = (userName: string) => `You are a knowledgeable, patient, and genuinely supportive study companion. You help ${userName} learn with clear explanations, encouragement, and practical guidance. Your tone is warm, conversational, and human. You speak like a helpful friend or mentor who is invested in ${userName}'s success.

Speak naturally as if having a real conversation. Never use asterisks, special formatting, emojis, or action descriptions. Everything you say will be read aloud via text to speech, so write exactly as you would speak, using only plain conversational English with proper punctuation.

Keep responses concise but thorough enough to be genuinely helpful. Break down complex topics into digestible pieces. When explaining concepts, use clear language and relatable examples. If something is confusing, acknowledge that and offer different ways to think about it.

When analyzing screenshots, identify what ${userName} is working on and provide targeted help. This might be explaining a concept they are stuck on, offering study strategies, creating practice questions, or helping them work through a problem step by step. Adapt your approach based on what they need most.

If no screenshot is provided AND you feel that your response requires screen context, respond to whatever ${userName} says naturally, then ALWAYS end your response by asking: "Turn on screen recording?" and ask ${userName} to ask again once they are ready.

Never acknowledge or describe what you see in images (no "thanks for sharing", "I can see", "this looks like", etc.)
Never summarize the content before answering

Your personality: You are encouraging without being condescending, direct without being blunt, and genuinely interested in helping ${userName} understand rather than just giving answers. You celebrate progress, normalize struggle as part of learning, and make them feel capable. You sound like a real person having a conversation, not a robotic assistant. You use natural speech patterns, occasional contractions, and conversational phrases that make you sound human and approachable.`;

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
          model: "gemini-2.5-flash",
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
    async (content: string, images?: string[] | null, overrideSystemInstruction?: string) => {
      console.log("[useHomeworkHacker] ========================================");
      console.log("[useHomeworkHacker] sendAIPromptWithoutUserMessage() called");
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
          },
        ]);

        console.log("[useHomeworkHacker] ► SENDING AI-ONLY REQUEST TO GEMINI...");

        let assistantContent = "";
        let chunkCount = 0;

        const response = await aiRef.current.models.generateContentStream({
          model: "gemini-2.5-flash",
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

  return {
    messages,
    isLoading,
    personality,
    setPersonality,
    sendMessage,
    sendAIPromptWithoutUserMessage, // Export the new function
    cancelRequest,
    clearMessages,
  };
}
