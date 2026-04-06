import React from 'react';
import { Button } from '../ui/button';
import { X, Plus } from 'lucide-react';

interface PlacementTabsProps {
  selectedPlacements: string[];
  activePlacement: string;
  placementHasDesign: Record<string, boolean>;
  onTabChange: (placement: string) => void;
  onAddPlacement: () => void;
  onRemovePlacement: (placement: string) => void;
}

const PLACEMENT_LABELS: Record<string, string> = {
  front: 'Front Print',
  back: 'Back Print',
  sleeve_left: 'Left Sleeve',
  sleeve_right: 'Right Sleeve',
  default: 'Wrap Print'
};

export function PlacementTabs({
  selectedPlacements,
  activePlacement,
  placementHasDesign,
  onTabChange,
  onAddPlacement,
  onRemovePlacement
}: PlacementTabsProps) {
  
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
      {selectedPlacements.map((placement) => {
        const isActive = activePlacement === placement;
        const hasContent = placementHasDesign[placement];
        
        return (
          <div 
            key={placement}
            className={`relative flex items-center px-4 py-2 rounded-full cursor-pointer transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'
            }`}
            onClick={() => onTabChange(placement)}
          >
            {hasContent ? (
              <span className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-white' : 'bg-primary'}`} />
            ) : (
              <span className={`w-2 h-2 rounded-full border mr-2 ${isActive ? 'border-white/50' : 'border-white/30'}`} />
            )}
            
            <span className="text-sm font-medium whitespace-nowrap">
              {PLACEMENT_LABELS[placement] || placement}
            </span>
            
            {placement !== 'front' && placement !== 'default' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlacement(placement);
                }}
                className="ml-2 p-0.5 rounded-full hover:bg-black/20"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onAddPlacement}
        className="rounded-full border-dashed border-white/20 bg-transparent hover:bg-white/5"
      >
        <Plus size={16} className="mr-1" /> Add placement
      </Button>
    </div>
  );
}
