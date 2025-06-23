import { type Shape, type CanvasView, RectangleShape, ImageShape, SVGShape, PathShape, TextShape } from '@/lib/types';
import { getBounds } from './geometry';

function shapeToSvgElement(shape: Shape): string {
  const transform = `transform="rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})"`;
  const opacity = `opacity="${shape.opacity ?? 1}"`;

  switch (shape.type) {
    case 'rectangle': {
      const rect = shape as RectangleShape;
      const style_attrs = `fill="${rect.fill || 'transparent'}" fill-opacity="${rect.fillOpacity ?? 1}" stroke="${rect.stroke || 'none'}" stroke-width="${rect.strokeWidth || 0}" stroke-opacity="${rect.strokeOpacity ?? 1}"`;
      return `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="${rect.borderRadius || 0}" ${transform} ${opacity} ${style_attrs} />`;
    }
    case 'circle': {
      const style_attrs = `fill="${shape.fill || 'transparent'}" fill-opacity="${shape.fillOpacity ?? 1}" stroke="${shape.stroke || 'none'}" stroke-width="${shape.strokeWidth || 0}" stroke-opacity="${shape.strokeOpacity ?? 1}"`;
      return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${transform} ${opacity} ${style_attrs} />`;
    }
    case 'polygon': {
       const polyTransform = `translate(${shape.x}, ${shape.y})`;
       const style_attrs = `fill="${shape.fill || 'transparent'}" fill-opacity="${shape.fillOpacity ?? 1}" stroke="${shape.stroke || 'none'}" stroke-width="${shape.strokeWidth || 0}" stroke-opacity="${shape.strokeOpacity ?? 1}"`;
       return `<polygon points="${shape.points}" transform="${polyTransform} rotate(${shape.rotation} ${shape.width / 2} ${shape.height / 2})" ${opacity} ${style_attrs} />`;
    }
    case 'line': {
      const style_attrs = `fill="none" stroke="${shape.stroke || 'none'}" stroke-width="${shape.strokeWidth || 0}" stroke-opacity="${shape.strokeOpacity ?? 1}"`;
      return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}" ${transform} ${opacity} ${style_attrs} />`;
    }
    case 'image': {
      const imgShape = shape as ImageShape;
      return `<image href="${imgShape.href}" x="${imgShape.x}" y="${imgShape.y}" width="${imgShape.width}" height="${imgShape.height}" ${transform} ${opacity} />`;
    }
    case 'svg': {
      const svgShape = shape as SVGShape;
      const svgHref = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgShape.svgString)))}`;
      return `<image href="${svgHref}" x="${svgShape.x}" y="${svgShape.y}" width="${svgShape.width}" height="${svgShape.height}" ${transform} ${opacity} />`;
    }
    case 'path': {
        const pathShape = shape as PathShape;
        const pathTransform = `translate(${pathShape.x}, ${pathShape.y})`;
        const style_attrs = `fill="${pathShape.fill || 'none'}" fill-opacity="${pathShape.fillOpacity ?? 1}" stroke="${pathShape.stroke || 'none'}" stroke-width="${pathShape.strokeWidth || 0}" stroke-opacity="${pathShape.strokeOpacity ?? 1}" stroke-linecap="round" stroke-linejoin="round"`;
        return `<path d="${pathShape.d}" transform="${pathTransform} rotate(${pathShape.rotation} ${pathShape.width / 2} ${pathShape.height / 2})" ${opacity} ${style_attrs} />`;
    }
    case 'text': {
        const textShape = shape as TextShape;
        return `<text x="${textShape.x}" y="${textShape.y}" font-family="${textShape.fontFamily}" font-size="${textShape.fontSize}" font-weight="${textShape.fontWeight}" fill="${textShape.fill}" stroke="${textShape.stroke || 'none'}" stroke-width="${textShape.strokeWidth || 0}" dominant-baseline="text-before-edge" ${transform} ${opacity}>${textShape.text}</text>`;
    }
  }
}

export function exportToSvg(shapes: Shape[], width: number, height: number, view: CanvasView) {
  const svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="hsl(var(--background))" />
  <g transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})">
    ${shapes.map(shapeToSvgElement).join('\n  ')}
  </g>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'design.svg');
}

export function exportToJpeg(shapes: Shape[], width: number, height: number, view: CanvasView) {
  const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="hsl(var(--background))" />
  <g transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})">
    ${shapes.map(shapeToSvgElement).join('\n  ')}
  </g>
</svg>`;
  const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const img = new Image();
  img.onload = () => {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(svgUrl);
    const jpegUrl = canvas.toDataURL('image/jpeg');
    triggerDownload(jpegUrl, 'design.jpg');
  };
  img.onerror = (e) => {
    console.error("Failed to load SVG image for JPEG conversion", e);
    URL.revokeObjectURL(svgUrl);
  }
  img.src = svgUrl;
}

export function exportSelectionToSvg(shapes: Shape[]) {
  if (shapes.length === 0) return;

  const bounds = getBounds(shapes);
  
  const svgContent = `<svg width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="transparent" />
  <g transform="translate(${-bounds.x}, ${-bounds.y})">
    ${shapes.map(shapeToSvgElement).join('\n  ')}
  </g>
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'selection.svg');
}

export function exportSelectionToJpeg(shapes: Shape[]) {
    if (shapes.length === 0) return;

    const bounds = getBounds(shapes);
    const width = bounds.width;
    const height = bounds.height;

    const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="hsl(var(--background))" />
    <g transform="translate(${-bounds.x}, ${-bounds.y})">
        ${shapes.map(shapeToSvgElement).join('\n  ')}
    </g>
    </svg>`;
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);
        const jpegUrl = canvas.toDataURL('image/jpeg');
        triggerDownload(jpegUrl, 'selection.jpg');
    };
    img.onerror = (e) => {
        console.error("Failed to load SVG image for JPEG conversion", e);
        URL.revokeObjectURL(svgUrl);
    }
    img.src = svgUrl;
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
