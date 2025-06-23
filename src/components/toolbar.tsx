'use client';

import React from 'react';
import { type Tool } from '@/lib/types';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';
import { MousePointer, Square, Circle, Hexagon, Combine, Diff, Layers, Eclipse, Star, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToolbarProps = {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onBooleanOperation: (operation: 'union' | 'subtract' | 'intersect' | 'exclude') => void;
  disabled: boolean;
};

const tools: { name: Tool; icon: React.ElementType; tooltip: string }[] = [
  { name: 'select', icon: MousePointer, tooltip: 'Select (V)' },
  { name: 'rectangle', icon: Square, tooltip: 'Rectangle (R)' },
  { name: 'circle', icon: Circle, tooltip: 'Circle / Ellipse (O)' },
  { name: 'polygon', icon: Hexagon, tooltip: 'Polygon (P)' },
];

const booleanOps = [
  { name: 'union', icon: Combine, tooltip: 'Union' },
  { name: 'subtract', icon: Diff, tooltip: 'Subtract' },
  { name: 'intersect', icon: Layers, tooltip: 'Intersect' },
  { name: 'exclude', icon: Eclipse, tooltip: 'Exclude' },
];

const props = [
  { name: 'star', icon: Star, tooltip: 'Star Prop' },
  { name: 'heart', icon: Heart, tooltip: 'Heart Prop' },
]

export function Toolbar({ activeTool, onToolSelect, onBooleanOperation, disabled }: ToolbarProps) {
  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, propType: string) => {
    e.dataTransfer.setData("application/vectormate-prop", propType);
  };
  
  return (
    <aside className="w-16 flex flex-col items-center py-4 border-r bg-card text-card-foreground shrink-0">
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col gap-2">
          {tools.map(({ name, icon: Icon, tooltip }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === name ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => onToolSelect(name)}
                  className={cn(activeTool === name && 'text-primary ring-2 ring-primary/50')}
                >
                  <Icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Separator className="my-4" />
        
        <div className="flex flex-col gap-2">
           {booleanOps.map(({ name, icon: Icon, tooltip }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size="icon"
                  onClick={() => onBooleanOperation(name as any)}
                  disabled={disabled}
                >
                  <Icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        
        <div className="mt-auto flex flex-col gap-4">
          <Separator />
          <h3 className="text-xs text-muted-foreground font-semibold text-center">PROPS</h3>
          {props.map(({ name, icon: Icon, tooltip }) => (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size="icon"
                  draggable
                  onDragStart={(e) => handleDragStart(e, name)}
                  className="cursor-grab"
                >
                  <Icon className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </aside>
  );
}
