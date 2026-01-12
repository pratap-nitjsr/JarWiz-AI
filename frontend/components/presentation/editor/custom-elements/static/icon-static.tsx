"use client";
import type React from "react";
import { useEffect, useState, type ReactNode } from "react";

import { PlateElement, type PlateElementProps } from "platejs/react";

import { cn } from "@/lib/utils";
import { type TIconElement } from "../../plugins/icon-plugin";

type IconModule = Record<string, React.ComponentType<{ size?: number }>>;

async function loadIconComponent(iconName: string): Promise<ReactNode> {
  try {
    const prefix = iconName.slice(0, 2).toLowerCase();
    let mod: IconModule;
    switch (prefix) {
      case "fa":
        mod = (await import("react-icons/fa")) as unknown as IconModule;
        break;
      case "md":
        mod = (await import("react-icons/md")) as unknown as IconModule;
        break;
      case "bs":
        mod = (await import("react-icons/bs")) as unknown as IconModule;
        break;
      case "ai":
        mod = (await import("react-icons/ai")) as unknown as IconModule;
        break;
      default:
        mod = (await import("react-icons/fa")) as unknown as IconModule;
    }
    const Comp = mod[iconName];
    return Comp ? <Comp size={24} /> : null;
  } catch {
    return null;
  }
}

export function IconStatic(props: PlateElementProps<TIconElement>) {
  const { name, query = "home" } = props.element;
  const [iconEl, setIconEl] = useState<ReactNode>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (name) {
        const el = await loadIconComponent(name);
        if (!cancelled) setIconEl(el);
        return;
      }
      if (query) {
        // Try FA then MD for a fuzzy match
        const [fa, md] = await Promise.all([
          import("react-icons/fa"),
          import("react-icons/md"),
        ]);
        const term = query.toLowerCase();
        const faKey = Object.keys(fa).find((k) =>
          k.toLowerCase().includes(term),
        );
        const mdKey = Object.keys(md).find((k) =>
          k.toLowerCase().includes(term),
        );
        const key = faKey ?? mdKey;
        if (key) {
          const el = await loadIconComponent(key);
          if (!cancelled) setIconEl(el);
          return;
        }
      }
      if (!cancelled) setIconEl(null);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [name, query]);

  return (
    <PlateElement
      {...props}
      className={cn("inline-flex justify-center", props.className)}
    >
      <div className="mb-2 p-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border shadow-sm">
          {iconEl ?? <div className="h-4 w-4" />}
        </div>
      </div>
      {props.children}
    </PlateElement>
  );
}
