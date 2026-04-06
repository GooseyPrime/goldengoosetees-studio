import React, { useEffect, useRef, useState } from 'react';
import { ProductConfig, getPlacementConfig } from '../../lib/config/products.config';

interface DesignCanvasProps {
  placement: string;
  productConfig: ProductConfig;
  initialCanvasJson?: string;
  onCanvasChange: (placement: string, json: string) => void;
  onExportReady: (placement: string, dataUrl: string) => void;
}

export function DesignCanvas({
  placement,
  productConfig,
  initialCanvasJson,
  onCanvasChange,
  onExportReady
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);

  useEffect(() => {
    // Dynamic import of fabric to avoid SSR issues if used in Next.js, 
    // but in Vite it's safe to just import normally, or load from CDN/npm.
    // For this boilerplate, we'll assume `window.fabric` is available or imported.
    import('fabric').then((fabricModule) => {
      const fabric = (fabricModule as any).fabric || fabricModule.default || (window as any).fabric;
      
      if (!canvasRef.current || !fabric) return;

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 800,
        backgroundColor: 'transparent',
      });

      if (initialCanvasJson) {
        canvas.loadFromJSON(initialCanvasJson, () => {
          canvas.renderAll();
        });
      }

      setFabricCanvas(canvas);

      // Debounce saving
      let saveTimeout: ReturnType<typeof setTimeout>;
      const saveState = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const json = JSON.stringify(canvas.toJSON());
          onCanvasChange(placement, json);
        }, 2000);
      };

      canvas.on('object:modified', saveState);
      canvas.on('object:added', saveState);
      canvas.on('object:removed', saveState);

      return () => {
        canvas.dispose();
      };
    });
  }, [placement]);

  const exportCanvas = () => {
    if (!fabricCanvas) return;

    const placementConfig = getPlacementConfig(productConfig.printfulProductId, placement);
    if (!placementConfig) return;

    const exportPx = placementConfig.canvasExportPx;
    const originalWidth = fabricCanvas.width;
    const originalHeight = fabricCanvas.height;

    fabricCanvas.setDimensions({ width: exportPx, height: exportPx });
    
    // Scale objects up for export
    const scaleFactor = exportPx / originalWidth;
    fabricCanvas.getObjects().forEach((obj: any) => {
      obj.scaleX = (obj.scaleX || 1) * scaleFactor;
      obj.scaleY = (obj.scaleY || 1) * scaleFactor;
      obj.left = (obj.left || 0) * scaleFactor;
      obj.top = (obj.top || 0) * scaleFactor;
      obj.setCoords();
    });

    const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
    onExportReady(placement, dataUrl);

    // Restore sizes
    fabricCanvas.getObjects().forEach((obj: any) => {
      obj.scaleX = (obj.scaleX || 1) / scaleFactor;
      obj.scaleY = (obj.scaleY || 1) / scaleFactor;
      obj.left = (obj.left || 0) / scaleFactor;
      obj.top = (obj.top || 0) / scaleFactor;
      obj.setCoords();
    });

    fabricCanvas.setDimensions({ width: originalWidth, height: originalHeight });
    fabricCanvas.renderAll();
  };

  return (
    <div className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[500px]">
      <div className="relative">
        {/* dashed border overlay showing print area constraints could go here */}
        <canvas ref={canvasRef} className="border border-white/20 shadow-lg bg-white bg-opacity-90 rounded" />
      </div>
      <div className="mt-4 flex gap-4">
        {/* Toolbar buttons */}
        <button onClick={() => exportCanvas()} className="bg-primary px-4 py-2 rounded font-bold text-black">
          Export / Save PNG
        </button>
      </div>
    </div>
  );
}
