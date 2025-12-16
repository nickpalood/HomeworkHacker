import { cn } from "@/lib/utils";

interface AudioWaveProps {
  isActive: boolean;
  className?: string;
}

export function AudioWave({ isActive, className }: AudioWaveProps) {
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            isActive ? "wave-animation" : "h-2",
            i % 2 === 0 ? "bg-[#f67555]" : "bg-[#68639c]"
          )}
          style={{
            height: isActive ? "24px" : "8px",
            animationDelay: `${i * 0.1}s`,
            animationDuration: isActive ? "1.2s" : "0s"
          }}
        />
      ))}
    </div>
  );
}
