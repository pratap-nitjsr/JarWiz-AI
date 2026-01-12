"use client";

import { type PlateSlide } from "@/components/presentation/utils/parser";
import { usePresentationState } from "@/states/presentation-state";
import { nanoid } from "nanoid";

export type InsertPosition = "before" | "after";

export function useSlideOperations() {
  const setSlides = usePresentationState((s) => s.setSlides);
  const setCurrentSlideIndex = usePresentationState(
    (s) => s.setCurrentSlideIndex,
  );

  const addSlide = (position: InsertPosition, index: number) => {
    const newSlide: PlateSlide = {
      content: [
        {
          type: "h1",
          children: [{ text: "New Slide" }],
        },
      ],
      id: nanoid(),
      alignment: "center",
    };
    const { slides } = usePresentationState.getState();
    const updatedSlides = [...slides];
    const insertIndex = position === "before" ? index : index + 1;
    updatedSlides.splice(insertIndex, 0, newSlide);
    setSlides(updatedSlides);
    setCurrentSlideIndex(insertIndex);
  };

  const deleteSlideAt = (index: number) => {
    const { slides } = usePresentationState.getState();
    const updatedSlides = [...slides];
    updatedSlides.splice(index, 1);
    setSlides(updatedSlides);
  };

  return { addSlide, deleteSlideAt };
}
