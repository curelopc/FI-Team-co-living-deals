import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
export function Explanation({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="mt-3"><Button variant="outline" size="sm" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>{open ? 'Hide explanation' : 'Show explanation'}</Button><div id={id} hidden={!open} className="mt-2">{children}</div></div>;
}
