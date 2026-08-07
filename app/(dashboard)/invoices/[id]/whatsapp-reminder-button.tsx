"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { logWhatsAppReminder } from "../actions";

export function WhatsAppReminderButton({
  phone,
  message,
  invoiceId,
}: {
  phone: string;
  message: string;
  invoiceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    window.open(
      buildWhatsAppLink(phone, message),
      "_blank",
      "noopener,noreferrer",
    );
    startTransition(async () => {
      await logWhatsAppReminder(invoiceId);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={handleClick}
      disabled={isPending}
    >
      <MessageCircle className="size-4" />
      Send WhatsApp Reminder
    </Button>
  );
}
