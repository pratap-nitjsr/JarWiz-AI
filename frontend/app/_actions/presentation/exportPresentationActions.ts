"use server";

import { convertPlateJSToPPTX } from "@/components/presentation/utils/exportToPPT";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { auth } from "@/server/auth";
import { db } from "@/server/db";

export async function exportPresentation(
  presentationId: string,
  fileName?: string,
  theme?: Partial<{
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    heading: string;
    muted: string;
  }>,
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    // Here you would fetch the presentation data from your database
    // This is a placeholder - implement actual data fetching based on your data model
    const presentationData = await fetchPresentationData(
      presentationId,
      session.user.id,
    );

    // Generate the PPT file (ArrayBuffer)
    const arrayBuffer = await convertPlateJSToPPTX(
      { slides: presentationData.slides },
      theme,
    );

    // Convert ArrayBuffer to Base64 string for transmission to the client
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Return base64 data so client can download it
    return {
      success: true,
      data: base64,
      fileName: `${fileName ?? "presentation"}.pptx`,
    };
  } catch (error) {
    console.error("Error exporting presentation:", error);
    return { success: false, error: "Failed to export presentation" };
  }
}

// Helper function to fetch presentation data
async function fetchPresentationData(presentationId: string, userId: string) {
  // Implement your actual data fetching logic here
  // For now returning a placeholder

  // In a real implementation, you would fetch from your database
  const presentation = await db.baseDocument.findFirst({
    where: { id: presentationId, userId: userId },
    include: { presentation: true },
  });

  return {
    id: presentation?.id,
    title: presentation?.title,
    slides: (
      presentation?.presentation?.content as unknown as { slides: PlateSlide[] }
    )?.slides,
  };
}
