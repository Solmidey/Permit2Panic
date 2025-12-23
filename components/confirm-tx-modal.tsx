"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmTxModalProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmTxModal({ trigger, title, description, onConfirm, isLoading }: ConfirmTxModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">Cancel</Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Sending..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
