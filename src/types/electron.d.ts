export interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
