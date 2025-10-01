// src/components/ui/copy-link-button.tsx
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CopyLinkButton({ id }: { id: string }) {
  const { toast } = useToast();

  async function copy() {
    const url = `${window.location.origin}/?post=${encodeURIComponent(id)}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Link copied to clipboard." });
  }

  return (
    <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy link">
      <Copy />
    </Button>
  );
}
