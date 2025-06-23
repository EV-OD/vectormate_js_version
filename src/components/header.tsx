'use client';

import React from 'react';
import { Button } from './ui/button';
import { Download, Feather } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type AppHeaderProps = {
  onExport: (format: 'svg' | 'jpeg') => void;
};

export function AppHeader({ onExport }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-card text-card-foreground shrink-0 z-10">
      <div className="flex items-center gap-2">
        <Feather className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold font-headline">VectorMate</h1>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport('svg')}>
              Export as SVG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('jpeg')}>
              Export as JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
