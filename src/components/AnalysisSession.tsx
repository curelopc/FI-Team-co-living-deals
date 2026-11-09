import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AnalysisInputs } from '@/lib/underwriting';
type Session = { inputs: Record<string, AnalysisInputs>; update: (id: string, value: AnalysisInputs) => void };
const AnalysisSession = createContext<Session | null>(null);
/** Browser route lifetime only, never module-global, persisted or sent to server. */
export function AnalysisSessionProvider({ children }: { children: ReactNode }) {
 const [inputs,setInputs]=useState<Record<string,AnalysisInputs>>({});
 return <AnalysisSession.Provider value={{inputs,update:(id,value)=>setInputs(current=>({...current,[id]:structuredClone(value)}))}}>{children}</AnalysisSession.Provider>;
}
export function useAnalysisSession(){const session=useContext(AnalysisSession);if(!session)throw new Error('Analysis session provider missing');return session;}
