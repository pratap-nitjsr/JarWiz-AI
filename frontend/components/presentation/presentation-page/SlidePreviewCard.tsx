import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface SlidePreviewCardProps {
  index: number;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function SlidePreviewCard({
  index,
  isActive,
  onClick,
  children,
}: SlidePreviewCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.2);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const BASE_WIDTH = 1024; // Logical slide width to scale from

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const content = contentRef.current;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const newScale =
        containerRect.width > 0 ? containerRect.width / BASE_WIDTH : 0.2;
      setScale(newScale);

      // After scale is applied, measure scaled height
      requestAnimationFrame(() => {
        if (!contentRef.current) return;
        const rect = contentRef.current.getBoundingClientRect();
        setHeight(rect.height || undefined);
      });
    };

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(container);
    // also observe content in case fonts load and change height
    resizeObserver.observe(content);

    update();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-md border transition-all hover:border-primary",
        isActive ? "border-primary ring-1 ring-primary" : "border-muted",
      )}
      onClick={onClick}
    >
      <div className="absolute left-2 top-1 z-10 rounded-sm bg-muted px-1 py-0.5 text-xs font-medium text-muted-foreground">
        {index + 1}
      </div>
      <div
        ref={containerRef}
        className="pointer-events-none w-full overflow-hidden bg-card"
        style={{
          height: height ?? undefined,
          aspectRatio: height === undefined ? "16/9" : undefined,
          // scale: height === undefined ? `${scale}` : undefined,
          transition: "height 150ms ease-in-out",
        }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: BASE_WIDTH,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
