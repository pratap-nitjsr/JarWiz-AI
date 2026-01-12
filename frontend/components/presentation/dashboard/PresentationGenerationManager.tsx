"use client";

import { generateImageAction } from "@/app/_actions/image/generate";
import { getImageFromUnsplash } from "@/app/_actions/image/unsplash";
import { updatePresentation } from "@/app/_actions/presentation/presentationActions";
import { extractThinking } from "@/lib/thinking-extractor";
import { usePresentationState } from "@/states/presentation-state";
import { useChat, useCompletion } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { SlideParser } from "../utils/parser";

function stripXmlCodeBlock(input: string): string {
  let result = input.trim();
  if (result.startsWith("```xml")) {
    result = result.slice(6).trimStart();
  }
  if (result.endsWith("```")) {
    result = result.slice(0, -3).trimEnd();
  }
  return result;
}

export function PresentationGenerationManager() {
  const {
    numSlides,
    language,
    presentationInput,
    shouldStartOutlineGeneration,
    shouldStartPresentationGeneration,
    webSearchEnabled,
    modelProvider,
    modelId,
    setIsGeneratingOutline,
    setShouldStartOutlineGeneration,
    setShouldStartPresentationGeneration,
    resetGeneration,
    resetForNewGeneration,
    setOutline,
    setSearchResults,
    setSlides,
    setOutlineThinking,
    setPresentationThinking,
    setIsGeneratingPresentation,
    setCurrentPresentation,
    currentPresentationId,
    imageModel,
    imageSource,
    rootImageGeneration,
    startRootImageGeneration,
    completeRootImageGeneration,
    failRootImageGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    slides,
  } = usePresentationState();

  // Create a ref for the streaming parser to persist between renders
  const streamingParserRef = useRef<SlideParser>(new SlideParser());
  // Add refs to track the animation frame IDs
  const slidesRafIdRef = useRef<number | null>(null);
  const outlineRafIdRef = useRef<number | null>(null);
  const outlineBufferRef = useRef<string[] | null>(null);
  const searchResultsBufferRef = useRef<Array<{
    query: string;
    results: unknown[];
  }> | null>(null);
  // Track the last processed messages length to avoid unnecessary updates
  const lastProcessedMessagesLength = useRef<number>(0);
  // Track if title has already been extracted to avoid unnecessary processing
  const titleExtractedRef = useRef<boolean>(false);

  // Function to update slides using requestAnimationFrame
  const updateSlidesWithRAF = (): void => {
    // Extract thinking for presentation and parse only the remaining content
    const presentationThinkingExtract = extractThinking(presentationCompletion);
    if (presentationThinkingExtract.hasThinking) {
      setPresentationThinking(presentationThinkingExtract.thinking);
    }
    const presentationContentToParse = presentationThinkingExtract.hasThinking
      ? presentationThinkingExtract.content
      : presentationCompletion;

    const processedPresentationCompletion = stripXmlCodeBlock(
      presentationContentToParse,
    );
    streamingParserRef.current.reset();
    streamingParserRef.current.parseChunk(processedPresentationCompletion);
    streamingParserRef.current.finalize();
    const allSlides = streamingParserRef.current.getAllSlides();
    // Merge any completed root image URLs from state into streamed slides
    const mergedSlides = allSlides.map((slide) => {
      const gen = rootImageGeneration[slide.id];
      if (gen?.status === "success" && slide.rootImage?.query) {
        return {
          ...slide,
          rootImage: {
            ...slide.rootImage,
            url: gen.url,
          },
        };
      }
      return slide;
    });
    // For any slide that has a rootImage query but no url, ensure generation is tracked/started
    for (const slide of allSlides) {
      const slideId = slide.id;
      const rootImage = slide.rootImage;
      if (rootImage?.query && !rootImage.url) {
        const already = rootImageGeneration[slideId];
        if (!already || already.status === "error") {
          startRootImageGeneration(slideId, rootImage.query);
          void (async () => {
            try {
              let result;

              if (imageSource === "stock") {
                // Use Unsplash for stock images
                const unsplashResult = await getImageFromUnsplash(
                  rootImage.query,
                  rootImage.layoutType,
                );
                if (unsplashResult.success && unsplashResult.imageUrl) {
                  result = { image: { url: unsplashResult.imageUrl } };
                }
              } else {
                // Use AI generation
                result = await generateImageAction(rootImage.query, imageModel);
              }

              if (result?.image?.url) {
                completeRootImageGeneration(slideId, result.image.url);
                // If we don't have a thumbnail yet, set it now and persist once
                const stateNow = usePresentationState.getState();
                if (!stateNow.thumbnailUrl && stateNow.currentPresentationId) {
                  stateNow.setThumbnailUrl(result.image.url);
                  try {
                    await updatePresentation({
                      id: stateNow.currentPresentationId,
                      thumbnailUrl: result.image.url,
                    });
                  } catch {
                    // Ignore persistence errors for thumbnail to avoid interrupting generation flow
                  }
                }
                // Persist into slides state
                usePresentationState.getState().setSlides(
                  usePresentationState.getState().slides.map((s) =>
                    s.id === slideId
                      ? {
                          ...s,
                          rootImage: {
                            query: rootImage.query,
                            url: result.image.url,
                          },
                        }
                      : s,
                  ),
                );
              } else {
                failRootImageGeneration(slideId, "No image url returned");
              }
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Image generation failed";
              failRootImageGeneration(slideId, message);
            }
          })();
        }
      }
    }
    setSlides(mergedSlides);
    slidesRafIdRef.current = null;
  };

  // Function to extract title from content
  const extractTitle = (
    content: string,
  ): { title: string | null; cleanContent: string } => {
    const titleMatch = content.match(/<TITLE>(.*?)<\/TITLE>/i);
    if (titleMatch?.[1]) {
      const title = titleMatch[1].trim();
      const cleanContent = content.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
      return { title, cleanContent };
    }
    return { title: null, cleanContent: content };
  };

  // Function to process messages and extract data (optimized - only process last message)
  const processMessages = (messages: typeof outlineMessages): void => {
    if (messages.length <= 1) return;

    // Get the last message - this is where all the current data is
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Extract search results from the last message only (much more efficient)
    if (webSearchEnabled && lastMessage.parts) {
      const searchResults: Array<{ query: string; results: unknown[] }> = [];

      for (const part of lastMessage.parts) {
        if (part.type === "tool-invocation" && part.toolInvocation) {
          const invocation = part.toolInvocation;
          if (
            invocation.toolName === "webSearch" &&
            invocation.state === "result" &&
            "result" in invocation &&
            invocation.result
          ) {
            const query =
              typeof invocation.args?.query === "string"
                ? invocation.args.query
                : "Unknown query";

            // Parse the search result
            let parsedResult;
            try {
              parsedResult =
                typeof invocation.result === "string"
                  ? JSON.parse(invocation.result)
                  : invocation.result;
            } catch {
              parsedResult = invocation.result;
            }

            searchResults.push({
              query,
              results: parsedResult?.results || [],
            });
          }
        }
      }

      // Store search results in buffer (only if we found any)
      if (searchResults.length > 0) {
        searchResultsBufferRef.current = searchResults;
      }
    }

    // Extract outline from the last assistant message
    if (lastMessage.role === "assistant" && lastMessage.content) {
      // Extract <think> content from assistant message and keep only the remainder for parsing
      const thinkingExtract = extractThinking(lastMessage.content);
      if (thinkingExtract.hasThinking) {
        setOutlineThinking(thinkingExtract.thinking);
      }

      let cleanContent = thinkingExtract.hasThinking
        ? thinkingExtract.content
        : lastMessage.content;

      // Only extract title if we haven't done it yet
      if (!titleExtractedRef.current) {
        const { title, cleanContent: extractedCleanContent } =
          extractTitle(cleanContent);

        cleanContent = extractedCleanContent;

        // Set the title if found and mark as extracted
        if (title) {
          setCurrentPresentation(currentPresentationId, title);
          titleExtractedRef.current = true;
        } else {
          // Title not found yet, don't process outline
          return;
        }
      } else {
        // Title already extracted, just remove it from content if it exists
        cleanContent = cleanContent.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
      }

      // Parse the outline into sections
      const sections = cleanContent.split(/^# /gm).filter(Boolean);
      const outlineItems: string[] =
        sections.length > 0
          ? sections.map((section) => `# ${section}`.trim())
          : [];

      if (outlineItems.length > 0) {
        outlineBufferRef.current = outlineItems;
      }
    }
  };

  // Function to update outline and search results using requestAnimationFrame
  const updateOutlineWithRAF = (): void => {
    // Batch all updates in a single RAF callback for better performance

    // Update search results if available
    if (searchResultsBufferRef.current !== null) {
      setSearchResults(searchResultsBufferRef.current);
      searchResultsBufferRef.current = null;
    }

    // Update outline if available
    if (outlineBufferRef.current !== null) {
      setOutline(outlineBufferRef.current);
      outlineBufferRef.current = null;
    }

    // Clear the current frame ID
    outlineRafIdRef.current = null;
  };

  // Outline generation with or without web search
  const { messages: outlineMessages, append: appendOutlineMessage } = useChat({
    api: webSearchEnabled
      ? "/api/presentation/outline-with-search"
      : "/api/presentation/outline",
    body: {
      prompt: presentationInput,
      numberOfCards: numSlides,
      language,
      modelProvider,
      modelId,
    },
    onFinish: () => {
      setIsGeneratingOutline(false);
      setShouldStartOutlineGeneration(false);
      setShouldStartPresentationGeneration(false);

      const {
        currentPresentationId,
        outline,
        searchResults,
        currentPresentationTitle,
        theme,
        imageSource,
      } = usePresentationState.getState();

      if (currentPresentationId) {
        void updatePresentation({
          id: currentPresentationId,
          outline,
          searchResults,
          prompt: presentationInput,
          title: currentPresentationTitle ?? "",
          theme,
          imageSource,
        });
      }

      // Cancel any pending outline animation frame
      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    },
    onError: (error) => {
      toast.error("Failed to generate outline: " + error.message);
      resetGeneration();

      // Cancel any pending outline animation frame
      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    },
  });

  // Lightweight useEffect that only schedules RAF updates
  useEffect(() => {
    console.log("outlineMessages", outlineMessages);
    // Only update if we have new messages
    if (outlineMessages.length > 1) {
      lastProcessedMessagesLength.current = outlineMessages.length;

      // Process messages and store in buffers (non-blocking)
      processMessages(outlineMessages);

      // Only schedule a new frame if one isn't already pending
      if (outlineRafIdRef.current === null) {
        outlineRafIdRef.current = requestAnimationFrame(updateOutlineWithRAF);
      }
    }
  }, [outlineMessages, webSearchEnabled]);

  // Watch for outline generation start
  useEffect(() => {
    const startOutlineGeneration = async (): Promise<void> => {
      if (shouldStartOutlineGeneration) {
        try {
          // Reset all state except ID and input when starting new generation
          resetForNewGeneration();

          // Reset processing refs for new generation
          titleExtractedRef.current = false;

          setIsGeneratingOutline(true);

          // Get the current input after reset (it's preserved)
          const { presentationInput } = usePresentationState.getState();

          // Start the RAF cycle for outline updates
          if (outlineRafIdRef.current === null) {
            outlineRafIdRef.current =
              requestAnimationFrame(updateOutlineWithRAF);
          }

          await appendOutlineMessage(
            {
              role: "user",
              content: presentationInput,
            },
            {
              body: {
                prompt: presentationInput,
                numberOfCards: numSlides,
                language,
              },
            },
          );
        } catch (error) {
          console.log(error);
          // Error is handled by onError callback
        } finally {
          setIsGeneratingOutline(false);
          setShouldStartOutlineGeneration(false);
        }
      }
    };

    void startOutlineGeneration();
  }, [shouldStartOutlineGeneration]);

  const { completion: presentationCompletion, complete: generatePresentation } =
    useCompletion({
      api: "/api/presentation/generate",
      onFinish: (_prompt, _completion) => {
        setIsGeneratingPresentation(false);
        setShouldStartPresentationGeneration(false);
      },
      onError: (error) => {
        toast.error("Failed to generate presentation: " + error.message);
        resetGeneration();
        streamingParserRef.current.reset();

        // Cancel any pending animation frame
        if (slidesRafIdRef.current !== null) {
          cancelAnimationFrame(slidesRafIdRef.current);
          slidesRafIdRef.current = null;
        }
      },
    });

  useEffect(() => {
    if (presentationCompletion) {
      try {
        // Only schedule a new frame if one isn't already pending
        if (slidesRafIdRef.current === null) {
          slidesRafIdRef.current = requestAnimationFrame(updateSlidesWithRAF);
        }
      } catch (error) {
        console.error("Error processing presentation XML:", error);
        toast.error("Error processing presentation content");
      }
    }
  }, [presentationCompletion]);

  useEffect(() => {
    if (shouldStartPresentationGeneration) {
      const {
        outline,
        presentationInput,
        language,
        presentationStyle,
        currentPresentationTitle,
        searchResults: stateSearchResults,
        modelProvider,
        modelId,
        setThumbnailUrl,
      } = usePresentationState.getState();

      // Reset the parser before starting a new generation
      streamingParserRef.current.reset();
      setIsGeneratingPresentation(true);
      setThumbnailUrl(undefined);
      void generatePresentation(presentationInput ?? "", {
        body: {
          title: currentPresentationTitle ?? presentationInput ?? "",
          prompt: presentationInput ?? "",
          outline,
          searchResults: stateSearchResults,
          language,
          tone: presentationStyle,
          modelProvider,
          modelId,
        },
      });
    }
  }, [shouldStartPresentationGeneration]);

  // Listen for manual root image generation changes (when user manually triggers image generation)
  useEffect(() => {
    // Only process if we're not currently generating presentation or outline
    if (isGeneratingPresentation || isGeneratingOutline) {
      return;
    }

    // Check for any pending root image generations that need to be processed
    for (const [slideId, gen] of Object.entries(rootImageGeneration)) {
      if (gen.status === "pending") {
        // Find the slide to get the rootImage query
        const slide = slides.find((s) => s.id === slideId);
        if (slide?.rootImage?.query) {
          void (async () => {
            try {
              let result;

              if (imageSource === "stock") {
                // Use Unsplash for stock images
                const unsplashResult = await getImageFromUnsplash(
                  slide.rootImage!.query,
                  slide.rootImage!.layoutType,
                );
                if (unsplashResult.success && unsplashResult.imageUrl) {
                  result = { image: { url: unsplashResult.imageUrl } };
                }
              } else {
                // Use AI generation
                result = await generateImageAction(
                  slide.rootImage!.query,
                  imageModel,
                );
              }

              if (result?.image?.url) {
                completeRootImageGeneration(slideId, result.image.url);
                // Update the slide with the new image URL
                setSlides(
                  slides.map((s) =>
                    s.id === slideId
                      ? {
                          ...s,
                          rootImage: {
                            ...s.rootImage!,
                            url: result.image.url,
                          },
                        }
                      : s,
                  ),
                );
              } else {
                failRootImageGeneration(slideId, "No image url returned");
              }
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Image generation failed";
              failRootImageGeneration(slideId, message);
            }
          })();
        }
      }
    }
  }, [
    rootImageGeneration,
    isGeneratingPresentation,
    isGeneratingOutline,
    slides,
    imageSource,
    imageModel,
    completeRootImageGeneration,
    failRootImageGeneration,
    setSlides,
  ]);

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (slidesRafIdRef.current !== null) {
        cancelAnimationFrame(slidesRafIdRef.current);
        slidesRafIdRef.current = null;
      }

      if (outlineRafIdRef.current !== null) {
        cancelAnimationFrame(outlineRafIdRef.current);
        outlineRafIdRef.current = null;
      }
    };
  }, []);

  return null;
}
