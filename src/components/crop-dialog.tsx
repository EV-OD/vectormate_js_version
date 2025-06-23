'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { type ImageShape } from '@/lib/types';

interface CropDialogProps {
  shape: ImageShape;
  onClose: () => void;
  onSave: (crop: { x: number; y: number; width: number; height: number }) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: 'px', width: mediaWidth * 0.9 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function CropDialog({ shape, onClose, onSave }: CropDialogProps) {
  const [crop, setCrop] = useState<Crop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const imageToCrop = shape.originalHref || shape.href;

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  };

  const handleSave = () => {
    if (crop) {
      onSave({
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      });
    }
  };

  if (!imageToCrop) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center p-4 bg-muted/40 rounded-md">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
          >
            <img
              ref={imgRef}
              alt="Crop preview"
              src={imageToCrop}
              onLoad={onImageLoad}
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!crop || crop.width === 0}>
            Save Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
