"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  fallbackModels,
  getSelectedModel,
  setSelectedModel,
  useLocalModels,
} from "@/hooks/presentation/useLocalModels";
import { usePresentationState } from "@/states/presentation-state";
import { Bot, Cpu, Loader2, Monitor } from "lucide-react";
import { useEffect, useRef } from "react";

export function ModelPicker({
  shouldShowLabel = true,
}: {
  shouldShowLabel?: boolean;
}) {
  const { modelProvider, setModelProvider, modelId, setModelId } =
    usePresentationState();

  const { data: modelsData, isLoading, isInitialLoad } = useLocalModels();
  const hasRestoredFromStorage = useRef(false);

  // Load saved model selection from localStorage on mount
  useEffect(() => {
    if (!hasRestoredFromStorage.current) {
      const savedModel = getSelectedModel();
      if (savedModel) {
        console.log("Restoring model from localStorage:", savedModel);
        setModelProvider(
          savedModel.modelProvider as "openai" | "ollama" | "lmstudio",
        );
        setModelId(savedModel.modelId);
      }
      hasRestoredFromStorage.current = true;
    }
  }, [setModelProvider, setModelId]);

  // Use cached data if available, otherwise show fallback
  const displayData = modelsData || {
    localModels: fallbackModels,
    downloadableModels: [],
    showDownloadable: true,
  };

  const { localModels, downloadableModels, showDownloadable } = displayData;

  // Group models by provider
  const ollamaModels = localModels.filter(
    (model) => model.provider === "ollama",
  );
  const lmStudioModels = localModels.filter(
    (model) => model.provider === "lmstudio",
  );
  const downloadableOllamaModels = downloadableModels.filter(
    (model) => model.provider === "ollama",
  );

  // Helper function to create model option
  const createModelOption = (
    model: (typeof localModels)[0],
    isDownloadable = false,
  ) => ({
    id: model.id,
    label: model.name,
    displayLabel:
      model.provider === "ollama"
        ? `ollama ${model.name}`
        : `lm-studio ${model.name}`,
    icon: model.provider === "ollama" ? Cpu : Monitor,
    description: isDownloadable
      ? `Downloadable ${model.provider === "ollama" ? "Ollama" : "LM Studio"} model (will auto-download)`
      : `Local ${model.provider === "ollama" ? "Ollama" : "LM Studio"} model`,
    isDownloadable,
  });

  // Get current model value
  const getCurrentModelValue = () => {
    if (modelProvider === "ollama") {
      return `ollama-${modelId}`;
    } else if (modelProvider === "lmstudio") {
      return `lmstudio-${modelId}`;
    }
    return modelProvider;
  };

  // Get current model option for display
  const getCurrentModelOption = () => {
    const currentValue = getCurrentModelValue();

    if (currentValue === "openai") {
      return {
        label: "GPT-4o-mini",
        icon: Bot,
      };
    }

    // Check local models first
    const localModel = localModels.find((model) => model.id === currentValue);
    if (localModel) {
      return {
        label: localModel.name,
        icon: localModel.provider === "ollama" ? Cpu : Monitor,
      };
    }

    // Check downloadable models
    const downloadableModel = downloadableModels.find(
      (model) => model.id === currentValue,
    );
    if (downloadableModel) {
      return {
        label: downloadableModel.name,
        icon: downloadableModel.provider === "ollama" ? Cpu : Monitor,
      };
    }

    return {
      label: "Select model",
      icon: Bot,
    };
  };

  // Handle model change
  const handleModelChange = (value: string) => {
    console.log("Model changed to:", value);
    if (value === "openai") {
      setModelProvider("openai");
      setModelId("");
      setSelectedModel("openai", "");
      console.log("Saved to localStorage: openai, ''");
    } else if (value.startsWith("ollama-")) {
      const model = value.replace("ollama-", "");
      setModelProvider("ollama");
      setModelId(model);
      setSelectedModel("ollama", model);
      console.log("Saved to localStorage: ollama,", model);
    } else if (value.startsWith("lmstudio-")) {
      const model = value.replace("lmstudio-", "");
      setModelProvider("lmstudio");
      setModelId(model);
      setSelectedModel("lmstudio", model);
      console.log("Saved to localStorage: lmstudio,", model);
    }
  };

  return (
    <div>
      {shouldShowLabel && (
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Text Model
        </label>
      )}
      <Select value={getCurrentModelValue()} onValueChange={handleModelChange}>
        <SelectTrigger className="overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            {(() => {
              const currentOption = getCurrentModelOption();
              const Icon = currentOption.icon;
              return <Icon className="h-4 w-4 flex-shrink-0" />;
            })()}
            <span className="truncate text-sm">
              {getCurrentModelOption().label}
            </span>
          </div>
        </SelectTrigger>
        <SelectContent>
          {/* Loading indicator when fetching models */}
          {isLoading && !isInitialLoad && (
            <SelectGroup>
              <SelectLabel>Loading Models</SelectLabel>
              <SelectItem value="loading" disabled>
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">
                      Refreshing models...
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      Checking for new models
                    </span>
                  </div>
                </div>
              </SelectItem>
            </SelectGroup>
          )}

          {/* OpenAI Group */}
          <SelectGroup>
            <SelectLabel>Cloud Models</SelectLabel>
            <SelectItem value="openai">
              <div className="flex items-center gap-3">
                <Bot className="h-4 w-4 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm">GPT-4o-mini</span>
                  <span className="text-xs text-muted-foreground truncate">
                    Cloud-based AI model
                  </span>
                </div>
              </div>
            </SelectItem>
          </SelectGroup>

          {/* Local Ollama Models */}
          {ollamaModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Local Ollama Models</SelectLabel>
              {ollamaModels.map((model) => {
                const option = createModelOption(model);
                const Icon = option.icon;
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {/* Local LM Studio Models */}
          {lmStudioModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Local LM Studio Models</SelectLabel>
              {lmStudioModels.map((model) => {
                const option = createModelOption(model);
                const Icon = option.icon;
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {/* Downloadable Ollama Models */}
          {showDownloadable && downloadableOllamaModels.length > 0 && (
            <SelectGroup>
              <SelectLabel>Downloadable Ollama Models</SelectLabel>
              {downloadableOllamaModels.map((model) => {
                const option = createModelOption(model, true);
                const Icon = option.icon;
                return (
                  <SelectItem key={option.id} value={option.id}>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-sm">
                          {option.displayLabel}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
