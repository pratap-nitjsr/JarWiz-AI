"use client";
import { togglePresentationPublicStatus } from "@/app/_actions/presentation/sharedPresentationActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePresentationState } from "@/states/presentation-state";
import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Share } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ShareButton() {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const currentPresentationId = usePresentationState(
    (s) => s.currentPresentationId,
  );

  const { mutate: togglePublicStatus, isPending } = useMutation({
    mutationFn: async (makePublic: boolean) => {
      if (!currentPresentationId) {
        throw new Error("No presentation selected");
      }
      const result = await togglePresentationPublicStatus(
        currentPresentationId,
        makePublic,
      );
      if (!result.success) {
        throw new Error(result.message ?? "Failed to update sharing status");
      }
      return result;
    },
    onSuccess: (_data, variables) => {
      setIsPublic(variables);
      if (variables) {
        // Create share link
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/presentation/share/${currentPresentationId}`;
        setShareLink(shareUrl);
        toast.success("Presentation is now shared publicly");
      } else {
        setShareLink("");
        toast.success("Presentation is now private");
      }
    },
    onError: (error) => {
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Failed to update sharing status"}`,
      );
    },
  });

  const handleOpenDialog = () => {
    setIsShareDialogOpen(true);
  };

  const handleTogglePublic = (checked: boolean) => {
    togglePublicStatus(checked);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");

      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground"
        onClick={handleOpenDialog}
      >
        <Share className="mr-1 h-4 w-4" />
        Share
      </Button>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share presentation</DialogTitle>
            <DialogDescription>
              Make your presentation public to share it with others.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Switch
              id="public-mode"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isPending}
            />
            <Label htmlFor="public-mode">
              {isPublic
                ? "Public - Anyone with the link can view"
                : "Private - Only you can access"}
            </Label>
          </div>

          {isPublic && shareLink && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-2">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="link" className="sr-only">
                    Link
                  </Label>
                  <Input id="link" readOnly value={shareLink} className="h-9" />
                </div>
                <Button size="sm" className="px-3" onClick={copyToClipboard}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">Copy</span>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Anyone with this link will be able to view this presentation,
                but not edit it.
              </p>
            </div>
          )}

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsShareDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
