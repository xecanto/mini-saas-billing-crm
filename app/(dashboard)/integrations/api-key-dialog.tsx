"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Copy, Check, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createApiKeyRecord } from "./actions";

const SCOPES = [
  {
    id: "read" as const,
    label: "read",
    hint: "Fetch the plan catalogue and check a client's subscription status.",
  },
  {
    id: "checkout" as const,
    label: "checkout",
    hint: "Start a subscription or one-time purchase, creating the client here.",
  },
];

export function ApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Array<"read" | "checkout">>([
    "read",
    "checkout",
  ]);
  const [issued, setIssued] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function reset() {
    setName("");
    setScopes(["read", "checkout"]);
    setIssued(null);
    setCopied(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          router.refresh();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          New API key
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {issued ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your key now</DialogTitle>
              <DialogDescription className="flex items-start gap-2 text-amber-600">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Only a hash is stored, so this is the one and only time it is
                shown. If you lose it, revoke the key and make a new one.
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2">
              <Input readOnly value={issued} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(issued);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New API key</DialogTitle>
              <DialogDescription>
                One key per website keeps them independently revocable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Website or purpose</Label>
                <Input
                  id="key-name"
                  placeholder="notchive.com"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                {SCOPES.map((scope) => {
                  const enabled = scopes.includes(scope.id);
                  return (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() =>
                        setScopes((prev) =>
                          enabled
                            ? prev.filter((s) => s !== scope.id)
                            : [...prev, scope.id],
                        )
                      }
                      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors ${
                        enabled ? "border-primary bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <Badge variant={enabled ? "default" : "outline"}>
                        {scope.label}
                      </Badge>
                      <span className="text-muted-foreground">{scope.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button
                disabled={saving || !name.trim() || scopes.length === 0}
                onClick={async () => {
                  setSaving(true);
                  const result = await createApiKeyRecord({ name, scopes });
                  setSaving(false);
                  if (result.error) {
                    toast.error(result.error);
                    return;
                  }
                  setIssued(result.key ?? null);
                }}
              >
                {saving ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
