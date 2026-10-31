import React, { useState } from 'react';
import type { Resource } from '../types';
import { runGatedAction, type GateAction } from '../utils/libraryGate';
export default function GatedResourceAction({resource, action, className, children}: {
  resource: Resource; action: GateAction; className: string; children: React.ReactNode;
}) {
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function run() {
    setBusy(true); setMessage('');
    try {
      const tagged = await runGatedAction(resource,action);
      setMessage(tagged ? 'Test complete: resource tag added.' : 'Resource opened. The test tag could not be saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <div><button type="button" className={className+' w-full'} disabled={busy}
    onClick={event=>{event.stopPropagation();void run();}}>{busy ? 'Checking access…' : children}</button>
    {message && <p role="status" className="text-sm text-ink2 mt-2">{message}</p>}</div>;
}
