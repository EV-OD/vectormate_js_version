import { type Shape, type CanvasView, RectangleShape, ImageShape, SVGShape, PathShape, TextShape, PolygonShape } from '@/lib/types';
import { getBounds } from './geometry';

function getClipPathElement(shape: Shape): string {
    const transform = `transform="rotate(${shape.rotation || 0} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})"`;

    switch (shape.type) {
        case 'rectangle': {
            const rect = shape as RectangleShape;
            return `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="${rect.borderRadius || 0}" ${transform} />`;
        }
        case 'circle': {
            return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${transform} />`;
        }
        case 'polygon': {
            const poly = shape as PolygonShape;
            const polyTransform = `translate(${poly.x}, ${poly.y})`;
            return `<polygon points="${poly.points}" transform="${polyTransform} rotate(${poly.rotation || 0} ${poly.width / 2} ${poly.height / 2})" />`;
        }
        case 'path': {
            const pathShape = shape as PathShape;
            const pathTransform = `translate(${pathShape.x}, ${pathShape.y})`;
            return `<path d="${pathShape.d}" transform="${pathTransform} rotate(${pathShape.rotation || 0} ${pathShape.width / 2} ${pathShape.height / 2})" />`;
        }
        case 'text': {
            const textShape = shape as TextShape;
            return `<text x="${textShape.x}" y="${textShape.y}" font-family="${textShape.fontFamily}" font-size="${textShape.fontSize}" font-weight="${textShape.fontWeight}" dominant-baseline="text-before-edge" ${transform}>${textShape.text}</text>`;
        }
        default:
            return '';
    }
}


function shapeToSvgElement(shape: Shape): string {
  const transform = `transform="rotate(${shape.rotation} ${shape.x + shape.width / 2} ${shape.y + shape.height / 2})"`;
  const opacity = `opacity="${shape.opacity ?? 1}"`;
  const clipPathAttr = shape.clippedBy ? `clip-path="url(#clip-${shape.clippedBy})"` : '';


  switch (shape.type) {
    case 'rectangle': {
      const rect = shape as RectangleShape;
      const style_attrs = `fill="${rect.fill || 'transparent'}" fill-opacity="${rect.fillOpacity ?? 1}" stroke="${rect.stroke || 'none'}" stroke-width="${rect.strokeWidth || 0}" stroke-opacity="${rect.strokeOpacity ?? 1}"`;
      return `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="${rect.borderRadius || 0}" ${transform} ${opacity} ${style_attrs} ${clipPathAttr} />`;
    }
    case 'circle': {
      const style_attrs = `fill="${shape.fill || 'transparent'}" fill-opacity="${shape.fillOpacity ?? 1}" stroke="${shape.stroke || 'none'}" stroke-width="${shape.strokeWidth || 0}" stroke-opacity="${shape.strokeOpacity ?? 1}"`;
      return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${shape.width / 2}" ry="${shape.height / 2}" ${transform} ${opacity} ${style_attrs} ${clipPathAttr} />`;
    }
    case 'polygon': {
       const poly = shape as PolygonShape;
       const polyTransform = `translate(${poly.x}, ${poly.y})`;
       const style_attrs = `fill="${poly.fill || 'transparent'}" fill-opacity="${poly.fillOpacity ?? 1}" stroke="${poly.stroke || 'none'}" stroke-width="${poly.strokeWidth || 0}" stroke-opacity="${poly.strokeOpacity ?? 1}"`;
       return `<polygon points="${poly.points}" transform="${polyTransform} rotate(${poly.rotation} ${poly.width / 2} ${poly.height / 2})" ${opacity} ${style_attrs} ${clipPathAttr} />`;
    }
    case 'line': {
      const style_attrs = `fill="none" stroke="${shape.stroke || 'none'}" stroke-width="${shape.strokeWidth || 0}" stroke-opacity="${shape.strokeOpacity ?? 1}"`;
      return `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}" ${transform} ${opacity} ${style_attrs} ${clipPathAttr} />`;
    }
    case 'image': {
      const imgShape = shape as ImageShape;
      return `<image href="${imgShape.href}" x="${imgShape.x}" y="${imgShape.y}" width="${imgShape.width}" height="${imgShape.height}" ${transform} ${opacity} ${clipPathAttr} />`;
    }
    case 'svg': {
      const svgShape = shape as SVGShape;
      const svgHref = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgShape.svgString)))}`;
      return `<image href="${svgHref}" x="${svgShape.x}" y="${svgShape.y}" width="${svgShape.width}" height="${svgShape.height}" ${transform} ${opacity} ${clipPathAttr} />`;
    }
    case 'path': {
        const pathShape = shape as PathShape;
        const pathTransform = `translate(${pathShape.x}, ${pathShape.y})`;
        const style_attrs = `fill="${pathShape.fill || 'none'}" fill-opacity="${pathShape.fillOpacity ?? 1}" stroke="${pathShape.stroke || 'none'}" stroke-width="${pathShape.strokeWidth || 0}" stroke-opacity="${pathShape.strokeOpacity ?? 1}" stroke-linecap="round" stroke-linejoin="round"`;
        return `<path d="${pathShape.d}" transform="${pathTransform} rotate(${pathShape.rotation} ${pathShape.width / 2} ${pathShape.height / 2})" ${opacity} ${style_attrs} ${clipPathAttr} />`;
    }
    case 'text': {
        const textShape = shape as TextShape;
        return `<text x="${textShape.x}" y="${textShape.y}" font-family="${textShape.fontFamily}" font-size="${textShape.fontSize}" font-weight="${textShape.fontWeight}" fill="${textShape.fill}" stroke="${textShape.stroke || 'none'}" stroke-width="${textShape.strokeWidth || 0}" dominant-baseline="text-before-edge" ${transform} ${opacity} ${clipPathAttr}>${textShape.text}</text>`;
    }
    default: return '';
  }
}

function generateSvgContent(shapes: Shape[], width: number, height: number, viewBox: string, backgroundRect: string, additionalGTransform: string = "") {
    const clipPathDefs = shapes
        .filter(s => s.isClippingMask)
        .map(mask => `<clipPath id="clip-${mask.id}">${getClipPathElement(mask)}</clipPath>`)
        .join('\n    ');

    const shapesToRender = shapes
        .filter(s => !s.isClippingMask)
        .map(shapeToSvgElement)
        .join('\n  ');

    return `<svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${clipPathDefs}
  </defs>
  ${backgroundRect}
  <g ${additionalGTransform}>
    ${shapesToRender}
  </g>
</svg>`;
}

export function exportToSvg(shapes: Shape[], width: number, height: number, view: CanvasView) {
  const svgContent = generateSvgContent(
    shapes,
    width,
    height,
    `0 0 ${width} ${height}`,
    `<rect width="100%" height="100%" fill="hsl(var(--background))" />`,
    `transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})"`
  );

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'design.svg');
}

export function exportToJpeg(shapes: Shape[], width: number, height: number, view: CanvasView) {
    const svgContent = generateSvgContent(
      shapes,
      width,
      height,
      `0 0 ${width} ${height}`,
      `<rect width="100%" height="100%" fill="hsl(var(--background))" />`,
      `transform="translate(${view.pan.x} ${view.pan.y}) scale(${view.scale})"`
    );

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
  const svgContent = generateSvgContent(
    shapes,
    bounds.width,
    bounds.height,
    `0 0 ${bounds.width} ${bounds.height}`,
    `<rect width="100%" height="100%" fill="transparent" />`,
    `transform="translate(${-bounds.x}, ${-bounds.y})"`
  );

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'selection.svg');
}

export function exportSelectionToJpeg(shapes: Shape[]) {
    if (shapes.length === 0) return;

    const bounds = getBounds(shapes);
    const width = bounds.width;
    const height = bounds.height;

    const svgContent = generateSvgContent(
      shapes,
      width,
      height,
      `0 0 ${width} ${height}`,
      `<rect width="100%" height="100%" fill="hsl(var(--background))" />`,
      `transform="translate(${-bounds.x}, ${-bounds.y})"`
    );

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
