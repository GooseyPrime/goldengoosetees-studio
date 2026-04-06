import React, { useState, useEffect } from 'react';
import { getPlacementConfig, getProductConfig, calculateRetailPrice } from '../../lib/config/products.config';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

interface PlacementSelectorProps {
  productId: number;
  onConfirm: (placements: string[]) => void;
  onCancel: () => void;
}

export function PlacementSelector({ productId, onConfirm, onCancel }: PlacementSelectorProps) {
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(['front']);
  const productConfig = getProductConfig(productId);

  if (!productConfig) {
      return <div>Product not found</div>;
  }

  const handleToggle = (id: string) => {
    if (id === 'front') return; // Cannot uncheck front

    setSelectedPlacements((prev) => 
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const totalPrice = calculateRetailPrice(productId, selectedPlacements, 'L'); // generic size for preview

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold mb-4">Which areas do you want to customize?</h2>
        <div className="space-y-3 mb-6">
          {productConfig.placements.map((placement) => (
            <div key={placement.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id={placement.id} 
                  checked={selectedPlacements.includes(placement.id)}
                  onCheckedChange={() => handleToggle(placement.id)}
                  disabled={placement.id === 'front'}
                />
                <Label htmlFor={placement.id} className="font-medium cursor-pointer">
                  {placement.displayName}
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                {placement.additionalPrice > 0 ? `+$${placement.additionalPrice.toFixed(2)}` : 'Included'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm">
            <span className="text-muted-foreground">Total Price (starting): </span>
            <span className="font-bold text-lg">${totalPrice.toFixed(2)}</span>
          </div>
          <div className="space-x-3">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onConfirm(selectedPlacements)}>Start Designing →</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
