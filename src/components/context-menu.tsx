'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Copy,
  ClipboardPaste,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Crop,
  Scissors,
} from 'lucide-react';

type ContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  canPaste: boolean;
  onCrop: () => void;
  canCrop: boolean;
  onCreateClippingMask: () => void;
  canCreateClippingMask: boolean;
};

export function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onPaste,
  onDelete,
  onBringToFront,
  onSendToBack,
  canPaste,
  onCrop,
  canCrop,
  onCreateClippingMask,
  canCreateClippingMask,
}: ContextMenuProps) {
  return (
    <DropdownMenu open={true} onOpenChange={(open) => !open && onClose()}>
      <DropdownMenuTrigger asChild>
        <div style={{ position: 'fixed', left: x, top: y }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onContextMenu={(e) => e.preventDefault()}
        className="w-56"
      >
        {canCrop && (
            <DropdownMenuItem onClick={onCrop}>
                <Crop className="mr-2" />
                <span>Crop</span>
            </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onCopy}>
          <Copy className="mr-2" />
          <span>Copy</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPaste} disabled={!canPaste}>
          <ClipboardPaste className="mr-2" />
          <span>Paste</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateClippingMask} disabled={!canCreateClippingMask}>
          <Scissors className="mr-2" />
          <span>Create Clipping Mask</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onBringToFront}>
          <ArrowUpToLine className="mr-2" />
          <span>Bring to Front</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSendToBack}>
          <ArrowDownToLine className="mr-2" />
          <span>Send to Back</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="mr-2" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
