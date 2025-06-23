'use client';

import React from 'react';
import { Button } from './ui/button';
import { Download, Feather } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type CanvasView } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';


type AppHeaderProps = {
  onExport: (format: 'svg' | 'jpeg') => void;
  canvasView: CanvasView;
  onViewChange: (view: Partial<CanvasView>) => void;
};

export function AppHeader({ onExport, canvasView, onViewChange }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-card text-card-foreground shrink-0 z-10">
      <div className="flex items-center gap-2">
        <Feather className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold font-headline">VectorMate</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="bg-style">Background</Label>
          <Select value={canvasView.background} onValueChange={(value) => onViewChange({ background: value as CanvasView['background'] })}>
              <SelectTrigger className="w-[100px]" id="bg-style">
                  <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="solid">Solid</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="dots">Dots</SelectItem>
              </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-48">
          <Label htmlFor="grid-size">Grid Size</Label>
          <Slider 
              id="grid-size"
              value={[canvasView.gridSize]}
              onValueChange={([val]) => onViewChange({ gridSize: val })}
              min={10}
              max={100}
              step={5}
              disabled={canvasView.background === 'solid'}
          />
          <span className="text-sm text-muted-foreground w-8 text-right">{canvasView.gridSize}</span>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="snap-grid" checked={canvasView.snapToGrid} onCheckedChange={(checked) => onViewChange({ snapToGrid: checked })} disabled={canvasView.background === 'solid'}/>
            <Label htmlFor="snap-grid" className={cn(canvasView.background === 'solid' && 'text-muted-foreground')}>Snap to Grid</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="snap-objects" checked={canvasView.snapToObjects} onCheckedChange={(checked) => onViewChange({ snapToObjects: checked })} />
            <Label htmlFor="snap-objects">Snap to Objects</Label>
          </div>
        </div>
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
