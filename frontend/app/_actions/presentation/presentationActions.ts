"use client";

import { type PlateSlide } from "@/components/presentation/utils/parser";
import apiClient from "@/lib/api";

export async function createPresentation({
  content,
  title,
  theme = "default",
  outline,
  imageSource,
  presentationStyle,
  language,
}: {
  content: {
    slides: PlateSlide[];
  };
  title: string;
  theme?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
}) {
  try {
    const result = await apiClient.savePresentation(
      title ?? "Untitled Presentation",
      content.slides,
      outline?.join("\n") ?? "",
      theme,
      presentationStyle ?? "professional"
    );

    if (result.success && result.presentation_id) {
      // Adapt response to what was expected
      return {
        success: true,
        message: "Presentation created successfully",
        presentation: {
          id: result.presentation_id,
          title: title,
        }
      };
    }

    return {
      success: false,
      message: "Failed to create presentation",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to create presentation",
    };
  }
}

export async function createEmptyPresentation(
  title: string,
  theme = "default",
  language = "en-US",
) {
  const emptyContent: { slides: PlateSlide[] } = { slides: [] };

  return createPresentation({
    content: emptyContent,
    title,
    theme,
    language,
  });
}

export async function updatePresentation({
  id,
  content,
  prompt,
  title,
  theme,
  outline,
  searchResults,
  imageSource,
  presentationStyle,
  language,
  thumbnailUrl,
}: {
  id: string;
  content?: {
    slides: PlateSlide[];
    config?: Record<string, unknown>;
  };
  title?: string;
  theme?: string;
  prompt?: string;
  outline?: string[];
  searchResults?: Array<{ query: string; results: unknown[] }>;
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
  thumbnailUrl?: string;
}) {
  try {
    const updates: any = {};
    if (title) updates.title = title;
    if (content?.slides) updates.slides = content.slides;
    if (outline) updates.outline = outline.join("\n");
    if (theme) updates.theme = theme;
    if (presentationStyle) updates.style = presentationStyle;

    const result = await apiClient.updatePresentation(id, updates);

    return {
      success: result.success,
      message: result.success ? "Presentation updated successfully" : "Failed to update presentation",
      presentation: { id: result.presentation_id }
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation",
    };
  }
}

export async function updatePresentationTitle(id: string, title: string) {
  return updatePresentation({ id, title });
}

export async function deletePresentation(id: string) {
  try {
    const result = await apiClient.deletePresentation(id);
    return result;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to delete presentation",
    };
  }
}

export async function deletePresentations(ids: string[]) {
  // apiClient doesn't have bulk delete, so we loop or just implementation single for now
  try {
    const results = await Promise.all(ids.map(id => apiClient.deletePresentation(id)));
    const success = results.every(r => r.success);
    return {
      success,
      message: success ? "Presentations deleted successfully" : "Some deletions failed",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to delete presentations",
    };
  }
}

// Get the presentation with the presentation content
export async function getPresentation(id: string) {
  try {
    const result = await apiClient.getPresentation(id);
    // Adapt backend response to frontend expected structure
    return {
      success: true,
      presentation: {
        id: result.presentation_id,
        title: result.title,
        presentation: {
          content: { slides: result.slides },
          theme: result.theme,
          outline: result.outline ? result.outline.split("\n") : [],
        },
        userId: "current-user", // Backend handles access control
      }
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

export async function getPresentationContent(id: string) {
  const result = await getPresentation(id);
  if (result.success) {
    return {
      success: true,
      presentation: result.presentation.presentation
    };
  }
  return result;
}

export async function updatePresentationTheme(id: string, theme: string) {
  return updatePresentation({ id, theme });
}

export async function duplicatePresentation(id: string, newTitle?: string) {
  // Not directly supported by apiClient, so we fetch and save as new
  try {
    const original = await getPresentation(id);
    if (!original.success || !original.presentation) {
      return { success: false, message: "Original not found" };
    }

    const { presentation } = original;
    return createPresentation({
      title: newTitle ?? `${presentation.title} (Copy)`,
      content: presentation.presentation.content as { slides: PlateSlide[] },
      theme: presentation.presentation.theme,
      outline: presentation.presentation.outline,
    });
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to duplicate presentation",
    };
  }
}
