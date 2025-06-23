'use client';

import React from 'react';
import { type Tool } from '@/lib/types';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Hexagon, 
  Minus, 
  PenTool,
  Combine, 
  Diff, 
  Layers, 
  Eclipse, 
  Image,
  FileCode,
  Brush
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

type ToolbarProps = {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onBooleanOperation: (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => void;
  disabled: boolean;
  onAddImage: () => void;
  onAddSvg: () => void;
};

const selectTool = { name: 'select' as const, icon: MousePointer, tooltip: 'Select (V)' };

const shapeTools: { name: Tool; icon: React.ElementType; tooltip: string }[] = [
  { name: 'rectangle', icon: Square, tooltip: 'Rectangle (R)' },
  { name: 'circle', icon: Circle, tooltip: 'Circle / Ellipse (O)' },
  { name: 'polygon', icon: Hexagon, tooltip: 'Polygon (P)' },
  { name: 'line', icon: Minus, tooltip: 'Line (L)' },
];

const booleanOps: { name: 'union' | 'subtract' | 'intersect' | 'exclude', icon: React.ElementType, tooltip: string }[] = [
  { name: 'union', icon: Combine, tooltip: 'Union' },
  { name: 'subtract', icon: Diff, tooltip: 'Subtract' },
  { name: 'intersect', icon: Layers, tooltip: 'Intersect' },
  { name: 'exclude', icon: Eclipse, tooltip: 'Exclude' },
];

export function Toolbar({ 
  activeTool, 
  onToolSelect, 
  onBooleanOperation, 
  disabled,
  onAddImage,
  onAddSvg,
}: ToolbarProps) {
  const ActiveShapeIcon = shapeTools.find(t => t.name === activeTool)?.icon || PenTool;
  const isShapeToolActive = shapeTools.some(t => t.name === activeTool);

  return (
    <aside className="w-16 flex flex-col items-center py-4 border-r bg-card text-card-foreground shrink-0">
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col gap-2">
          {/* Select Tool */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === selectTool.name ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onToolSelect(selectTool.name)}
                className={cn(activeTool === selectTool.name && 'text-primary ring-2 ring-primary/50')}
              >
                <selectTool.icon className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{selectTool.tooltip}</p>
            </TooltipContent>
          </Tooltip>

          {/* Shape Tools Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isShapeToolActive ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn(isShapeToolActive && 'text-primary ring-2 ring-primary/50')}
                  >
                    <ActiveShapeIcon className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Drawing Tools</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right">
              {shapeTools.map(({ name, icon: Icon, tooltip }) => (
                <DropdownMenuItem key={name} onSelect={() => onToolSelect(name as Tool)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{tooltip.split(' (')[0]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === 'brush' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => onToolSelect('brush')}
                className={cn(activeTool === 'brush' && 'text-primary ring-2 ring-primary/50')}
              >
                <Brush className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Brush (B)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-2">
          {/* Boolean Operations Dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size="icon"
                    disabled={disabled}
                  >
                    <Combine className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Boolean Operations</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right">
              {booleanOps.map(({ name, icon: Icon, tooltip }) => (
                <DropdownMenuItem key={name} onSelect={() => onBooleanOperation(name)} disabled={disabled}>
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{tooltip}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <Separator className="my-4" />

        <div className="flex flex-col gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size="icon"
                onClick={onAddImage}
              >
                <Image className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add Image</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size="icon"
                onClick={onAddSvg}
              >
                <FileCode className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add SVG</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </aside>
  );
}
