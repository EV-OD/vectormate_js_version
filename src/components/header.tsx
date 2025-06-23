'use client';

import React from 'react';
import { Button } from './ui/button';
import { Download, Feather, View } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
      
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <View className="mr-2" />
              View
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">View Settings</h4>
                <p className="text-sm text-muted-foreground">
                  Adjust the appearance and behavior of the canvas.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 items-center gap-4">
                  <Label>Background</Label>
                  <Select value={canvasView.background} onValueChange={(value) => onViewChange({ background: value as CanvasView['background'] })}>
                      <SelectTrigger>
                          <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="grid">Grid</SelectItem>
                          <SelectItem value="dots">Dots</SelectItem>
                      </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <div className="mb-1 flex justify-between items-baseline">
                    <Label htmlFor="grid-size" className={cn(canvasView.background === 'solid' && 'text-muted-foreground/50')}>Grid Size</Label>
                    <span className="text-sm text-muted-foreground">{canvasView.gridSize}px</span>
                  </div>
                  <Slider 
                      id="grid-size"
                      value={[canvasView.gridSize]}
                      onValueChange={([val]) => onViewChange({ gridSize: val })}
                      min={10}
                      max={100}
                      step={5}
                      disabled={canvasView.background === 'solid'}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap-grid" className="flex flex-col space-y-1">
                    <span className={cn(canvasView.background === 'solid' && 'text-muted-foreground/50')}>Snap to Grid</span>
                    <span className={cn("font-normal leading-snug text-muted-foreground", canvasView.background === 'solid' && 'text-muted-foreground/50')}>
                      Align objects to the background grid.
                    </span>
                  </Label>
                  <Switch id="snap-grid" checked={canvasView.snapToGrid} onCheckedChange={(checked) => onViewChange({ snapToGrid: checked })} disabled={canvasView.background === 'solid'}/>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="snap-objects" className="flex flex-col space-y-1">
                    <span>Snap to Objects</span>
                    <span className="font-normal leading-snug text-muted-foreground">
                      Align objects to other shapes.
                    </span>
                  </Label>
                  <Switch id="snap-objects" checked={canvasView.snapToObjects} onCheckedChange={(checked) => onViewChange({ snapToObjects: checked })} />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

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
