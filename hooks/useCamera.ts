import { useCallback, useState } from 'react';
import { useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';

export interface UseCameraResult {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  facing: CameraType;
  toggleFacing: () => void;
  flash: FlashMode;
  cycleFlash: () => void;
  ready: boolean;
  setReady: (ready: boolean) => void;
  capturing: boolean;
  setCapturing: (capturing: boolean) => void;
}

const FLASH_CYCLE: FlashMode[] = ['off', 'auto', 'on'];

export function useCamera(): UseCameraResult {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const toggleFacing = useCallback(() => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  const cycleFlash = useCallback(() => {
    setFlash((current) => {
      const idx = FLASH_CYCLE.indexOf(current);
      return FLASH_CYCLE[(idx + 1) % FLASH_CYCLE.length];
    });
  }, []);

  return {
    permission,
    requestPermission,
    facing,
    toggleFacing,
    flash,
    cycleFlash,
    ready,
    setReady,
    capturing,
    setCapturing,
  };
}
