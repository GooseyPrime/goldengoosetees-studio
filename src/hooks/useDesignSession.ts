import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UploadStatus {
    [placement: string]: 'idle' | 'uploading' | 'done' | 'error';
}

interface MockupVariantResult {
    catalog_variant_id: number;
    mockups: Array<{ placement: string; mockup_url: string; }>;
}

export function useDesignSession(initialDesignId: string | null = null, productId: number | null = null) {
    const [designId, setDesignId] = useState<string | null>(initialDesignId);
    const [sessionId, setSessionId] = useState<string>('');
    const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
    const [activePlacement, setActivePlacement] = useState<string>('front');
    
    const [canvasData, setCanvasData] = useState<Record<string, string>>({});
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
    
    const [mockupStatus, setMockupStatus] = useState<'idle'|'pending'|'partial'|'complete'|'failed'>('idle');
    const [mockupResults, setMockupResults] = useState<Record<string, MockupVariantResult[]>>({});
    
    useEffect(() => {
        let sid = localStorage.getItem('ggt_session_id');
        if (!sid) {
            sid = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem('ggt_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    const saveCanvas = useCallback(async (placement: string, json: string) => {
        setCanvasData(prev => ({ ...prev, [placement]: json }));
        
        if (!productId) return;
        
        try {
            const res = await fetch('/api/designs/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designId,
                    sessionId,
                    productId,
                    selectedPlacements,
                    activePlacement: placement,
                    canvasJson: json
                })
            });
            const data = await res.json();
            if (data.success && data.data.designId !== designId) {
                setDesignId(data.data.designId);
            }
        } catch (error) {
            console.error("Failed to save canvas state:", error);
        }
    }, [designId, sessionId, productId, selectedPlacements]);

    const uploadDesign = async (placement: string, dataUrl: string) => {
        if (!designId) {
            toast.error("Design ID not available. Please save the canvas first.");
            return;
        }
        
        setUploadStatus(prev => ({ ...prev, [placement]: 'uploading' }));
        
        try {
            const res = await fetch('/api/designs/upload-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    designId,
                    placement,
                    imageDataUrl: dataUrl
                })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setUploadStatus(prev => ({ ...prev, [placement]: 'done' }));
            toast.success(`Uploaded ${placement} design`);
            
        } catch (error: any) {
            console.error("Upload error:", error);
            setUploadStatus(prev => ({ ...prev, [placement]: 'error' }));
            toast.error(`Failed to upload ${placement}: ${error.message}`);
        }
    };

    const generateMockups = async () => {
        if (!designId) return;
        
        setMockupStatus('pending');
        
        try {
            const res = await fetch('/api/printful/mockup-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ designId })
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            const taskId = data.data.taskId;
            pollMockupStatus(taskId);
            
        } catch (error: any) {
            setMockupStatus('failed');
            toast.error(`Mockup generation failed: ${error.message}`);
        }
    };

    const pollMockupStatus = useCallback((taskId: number) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/printful/mockup-status?taskId=${taskId}`);
                const data = await res.json();
                
                if (data.data.status === 'completed') {
                    clearInterval(interval);
                    setMockupStatus('complete');
                    
                    // The backend should group these by placement or variant
                    // In a real implementation we would parse data.data.mockupResults
                    console.log("Mockups ready:", data.data.mockupResults);
                    // setMockupResults(...)
                } else if (data.data.status === 'failed') {
                    clearInterval(interval);
                    setMockupStatus('failed');
                    toast.error("Printful failed to generate mockups.");
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 3000);
    }, []);

    const addPlacement = (placement: string) => {
        if (!selectedPlacements.includes(placement)) {
            setSelectedPlacements(prev => [...prev, placement]);
        }
    };

    const removePlacement = (placement: string) => {
        setSelectedPlacements(prev => prev.filter(p => p !== placement));
        if (activePlacement === placement) {
            setActivePlacement(selectedPlacements[0] || 'front');
        }
    };

    return {
        designId,
        sessionId,
        selectedPlacements,
        activePlacement,
        setActivePlacement,
        canvasData,
        uploadStatus,
        mockupStatus,
        mockupResults,
        saveCanvas,
        uploadDesign,
        generateMockups,
        addPlacement,
        removePlacement,
        setSelectedPlacements
    };
}
