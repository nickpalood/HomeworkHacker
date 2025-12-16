import { useRef, useEffect, useState } from "react";
import { Send, Trash2, Volume2, VolumeX, Paperclip, X } from "lucide-react";
import { Message } from "@/hooks/useStudyBuddy";
import { MessageBubble } from "./MessageBubble";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  isSpeaking: boolean;
  onSendMessage: (message: string, images: string[] | null) => void;
  onClearMessages: () => void;
  onStopSpeaking: () => void;
}

export function ChatInterface({
  messages,
  isLoading,
  isSpeaking,
  onSendMessage,
  onClearMessages,
  onStopSpeaking,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

    // Debug logging for messages
  useEffect(() => {
    console.log("[ChatInterface] ========================================");
    console.log("[ChatInterface] Messages updated - total count:", messages.length);
    messages.forEach((msg, index) => {
      const hasImages = msg.images && msg.images.length > 0;
      const contentPreview = msg.content.substring(0, 60);
      console.log(`[ChatInterface] Message ${index + 1}:`, {
        id: msg.id.substring(0, 8) + "...",
        role: msg.role,
        contentLength: msg.content.length,
        contentPreview: contentPreview + (msg.content.length > 60 ? "..." : ""),
        hasImages: hasImages,
        imageCount: hasImages ? msg.images!.length : 0,
      });
    });
    console.log("[ChatInterface] isLoading:", isLoading);
    console.log("[ChatInterface] isSpeaking:", isSpeaking);
    console.log("[ChatInterface] ========================================");
  }, [messages, isLoading, isSpeaking]);


  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    handleFileSelect(e.clipboardData.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || images.length > 0) && !isLoading) {
      onSendMessage(inputValue.trim(), images);
      setInputValue("");
      setImages([]);
    }
  };

  return (
    <div className="flex h-full flex-col" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold text-foreground">Conversation</h2>
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStopSpeaking}
              className="text-muted-foreground hover:text-destructive"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearMessages}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-2">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Volume2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                Press the microphone or type to start studying
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
        {images.length > 0 && (
            <div className="mb-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {images.map((img, index) => (
                    <div key={index} className="relative">
                        <img src={img} alt={`preview ${index}`} className="w-full h-auto rounded-md" />
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-5 w-5"
                            onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        )}
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question or paste an image..."
            disabled={isLoading}
            className="flex-1 bg-transparent focus-visible:ring-2 focus-visible:ring-[#f67555]"
          />
          <input 
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            size="icon"
            variant="outline"
            className="border-2 border-[#68639c]/50 text-[#68639c] hover:bg-[#68639c]/20 hover:text-white hover:shadow-[0_0_12px_1px_#68639cb3,0_0_24px_4px_#68639c66]"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            disabled={(!inputValue.trim() && images.length === 0) || isLoading}
            size="icon"
            className="bg-[#f67555] text-white shadow-[0_0_12px_1px_#f67555b3,0_0_24px_4px_#f6755566]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
