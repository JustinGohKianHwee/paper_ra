"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { approveSynthesis } from "@/actions/synthesis";
import { Button } from "@/components/ui/button";

export function ApproveSynthesisButton({
  noteId,
  approved,
}: {
  noteId: string;
  approved: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (approved) return null;

  function approve() {
    startTransition(async () => {
      const result = await approveSynthesis(noteId);
      if (result.ok) {
        toast.success("Synthesis approved");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to approve");
      }
    });
  }

  return (
    <Button size="sm" onClick={approve} disabled={pending}>
      <CheckCircle2 className="size-4" />
      {pending ? "Approving…" : "Approve"}
    </Button>
  );
}
