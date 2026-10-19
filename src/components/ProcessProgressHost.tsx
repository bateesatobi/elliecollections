import { useEffect, useState } from 'react';
import {
  getProcessState,
  subscribeProcess,
  type ProcessState,
} from '../utils/processProgress';

/** Fixed top progress bar — mounts once at app root; mirrors every process. */
export function ProcessProgressHost() {
  const [state, setState] = useState<ProcessState | null>(() => getProcessState());

  useEffect(() => subscribeProcess(setState), []);

  if (!state) return null;

  const width = state.indeterminate ? undefined : `${state.percent}%`;

  return (
    <div
      className={`ec-process-host ${state.indeterminate ? 'is-indeterminate' : ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={state.indeterminate ? undefined : Math.round(state.percent)}
      aria-label={state.title}
      data-kind={state.kind}
    >
      <div className="ec-process-host-track">
        <div className="ec-process-host-fill" style={width ? { width } : undefined} />
      </div>
      <span className="ec-process-host-label">{state.status || state.title}</span>
    </div>
  );
}
