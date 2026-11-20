import { createContext, useContext } from 'react';
import type { Me, Status } from '../api';

export interface AppCtx {
  status: Status | null;
  me: Me;
  refreshStatus: () => void;
  toast: (msg: string) => void;
  signOut: () => void;
}
export const AppContext = createContext<AppCtx>(null!);
export const useApp = () => useContext(AppContext);
