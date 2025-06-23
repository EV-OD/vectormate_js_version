'use client';

import React from 'react';
import { type Shape } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type PropertiesPanelProps = {
  selectedShapes: Shape[];
  onShapesUpdate: (updatedShapes: Shape[]) => void;
  onDelete: () => void;
};

export function PropertiesPanel({ selectedShapes, onShapesUpdate, onDelete }: PropertiesPanelProps) {
  if (selectedShapes.length === 0) {
    return (
      <aside className="w-64 border-l bg-card text-card-foreground p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an object to see its properties.</p>
      </aside>
    );
  }

  const shape = selectedShapes[0]; // For now, edit only the first selected shape
  const multipleSelected = selectedShapes.length > 1;

  const handlePropertyChange = (prop: keyof Shape, value: any) => {
    if (multipleSelected) {
        const updatedShapes = selectedShapes.map(s => ({...s, [prop]: value}));
        onShapesUpdate(updatedShapes);
    } else {
        onShapesUpdate([{ ...shape, [prop]: value }]);
    }
  };

  return (
    <aside className="w-64 border-l bg-card text-card-foreground">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold font-headline">
              {multipleSelected ? `${selectedShapes.length} items` : shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}
            </h2>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <Accordion type="multiple" defaultValue={['transform', 'appearance']} className="w-full">
            <AccordionItem value="transform">
              <AccordionTrigger>Transform</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="pos-x">X</Label>
                    <Input id="pos-x" type="number" value={Math.round(shape.x)} onChange={e => handlePropertyChange('x', Number(e.target.value))} disabled={multipleSelected} />
                  </div>
                  <div>
                    <Label htmlFor="pos-y">Y</Label>
                    <Input id="pos-y" type="number" value={Math.round(shape.y)} onChange={e => handlePropertyChange('y', Number(e.target.value))} disabled={multipleSelected} />
                  </div>
                  <div>
                    <Label htmlFor="width">W</Label>
                    <Input id="width" type="number" value={Math.round(shape.width)} onChange={e => handlePropertyChange('width', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                  </div>
                  <div>
                    <Label htmlFor="height">H</Label>
                    <Input id="height" type="number" value={Math.round(shape.height)} onChange={e => handlePropertyChange('height', Math.max(0, Number(e.target.value)))} disabled={multipleSelected}/>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="rotation">Rotate</Label>
                    <Input id="rotation" type="number" value={Math.round(shape.rotation)} onChange={e => handlePropertyChange('rotation', Number(e.target.value))} disabled={multipleSelected}/>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="appearance">
              <AccordionTrigger>Appearance</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div>
                    <Label>Fill</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={shape.fill} onChange={e => handlePropertyChange('fill', e.target.value)} className="p-1 h-8 w-8" />
                      <Input type="text" value={shape.fill} onChange={e => handlePropertyChange('fill', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Opacity</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[shape.opacity * 100]}
                        onValueChange={([val]) => handlePropertyChange('opacity', val / 100)}
                        max={100}
                        step={1}
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">{Math.round(shape.opacity * 100)}%</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

        </div>
      </ScrollArea>
    </aside>
  );
}
