import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useStudyBuddy";
import { User, Bot, Monitor } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          isUser 
            ? "bg-[#f67555]/80 text-white shadow-[0_0_12px_1px_#f67555b3,0_0_24px_4px_#f6755566]" 
            : "bg-[#68639c]/80 text-white shadow-[0_0_12px_1px_#68639cb3,0_0_24px_4px_#68639c66]"
        )}
      >
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-2 rounded-2xl px-4 py-3",
          isUser
            ? "bg-[#f67555]/80 text-white rounded-br-md"
            : "glass-card rounded-bl-md"
        )}
      >
        {/* Images indicator */}
        {message.images && message.images.length > 0 && (
          <div className={cn(
            "flex items-center gap-2 text-xs pb-2 border-b",
            isUser ? "border-primary-foreground/20" : "border-border"
          )}>
            <Monitor className="h-3 w-3" />
            <span>{message.images.length} {message.images.length > 1 ? 'images' : 'image'} attached</span>
          </div>
        )}

        {/* Message text */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content || (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          )}
        </p>

        {/* Timestamp */}
        <span
          className={cn(
            "text-[10px] opacity-60",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
