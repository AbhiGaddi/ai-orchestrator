import { useEffect } from 'react';
import { ipc } from '@/lib/ipc';

/**
 * Hook to easily subscribe to an IPC event and clean up on unmount.
 */
export function useIpcEvent(channel: string, callback: (...args: any[]) => void) {
    useEffect(() => {
        ipc.on(channel, callback);
        return () => ipc.off(channel, callback);
    }, [channel, callback]);
}
