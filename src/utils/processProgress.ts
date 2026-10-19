/**
 * Global process progress — top bar always; blocking modal for submit/update/delete/pay/auth.
 * Supports a stack so nested processes (e.g. pay → place order) keep the UI continuous.
 */

import Swal from 'sweetalert2';
import type { ProcessKind } from './processCatalog';

export type ProcessMode = 'bar' | 'modal';

export type ProcessState = {
  id: number;
  kind: ProcessKind;
  title: string;
  status: string;
  percent: number;
  mode: ProcessMode;
  indeterminate: boolean;
};

type Listener = (state: ProcessState | null) => void;

let seq = 0;
const stack: ProcessState[] = [];
const listeners = new Set<Listener>();

const MODAL_KINDS: ProcessKind[] = ['submit', 'update', 'delete', 'pay', 'auth'];

function top(): ProcessState | null {
  return stack.length ? stack[stack.length - 1]! : null;
}

function notify() {
  const current = top();
  for (const fn of listeners) fn(current);
}

export function subscribeProcess(listener: Listener): () => void {
  listeners.add(listener);
  listener(top());
  return () => {
    listeners.delete(listener);
  };
}

export function getProcessState(): ProcessState | null {
  return top();
}

function defaultMode(kind: ProcessKind, mode?: ProcessMode): ProcessMode {
  if (mode) return mode;
  return MODAL_KINDS.includes(kind) ? 'modal' : 'bar';
}

function syncModalDom(state: ProcessState) {
  const bar = document.getElementById('ec-process-bar');
  const label = document.getElementById('ec-process-status');
  const titleEl = Swal.getTitle();
  if (titleEl) titleEl.textContent = state.title;
  if (bar) {
    if (state.indeterminate) {
      bar.classList.add('is-indeterminate');
      bar.style.width = '40%';
    } else {
      bar.classList.remove('is-indeterminate');
      bar.style.width = `${Math.max(0, Math.min(100, state.percent))}%`;
    }
  }
  if (label) label.textContent = state.status;
}

function ensureModal(state: ProcessState) {
  if (Swal.isVisible() && document.getElementById('ec-process-bar')) {
    syncModalDom(state);
    return;
  }
  void Swal.fire({
    title: state.title,
    html: `
      <p class="ec-process-modal-lead">${state.status || 'Please wait…'}</p>
      <div class="ec-process-track" aria-hidden="true">
        <div class="ec-process-fill" id="ec-process-bar"></div>
      </div>
      <p id="ec-process-status" class="ec-process-modal-status">${state.status}</p>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    customClass: { popup: 'ec-process-swal' },
    didOpen: () => syncModalDom(state),
  });
}

function closeModalIfOurs() {
  if (Swal.isVisible() && document.getElementById('ec-process-bar')) {
    Swal.close();
  }
}

export type StartProcessOpts = {
  kind: ProcessKind;
  title: string;
  status?: string;
  mode?: ProcessMode;
  /** Start at 0–100; omit for indeterminate pulse */
  percent?: number;
};

export function startProcess(opts: StartProcessOpts): number {
  const id = ++seq;
  const mode = defaultMode(opts.kind, opts.mode);
  const indeterminate = opts.percent == null;
  const state: ProcessState = {
    id,
    kind: opts.kind,
    title: opts.title,
    status: opts.status || opts.title,
    percent: opts.percent ?? 12,
    mode,
    indeterminate,
  };
  stack.push(state);
  notify();
  if (mode === 'modal') ensureModal(state);
  return id;
}

export function setProcess(percent: number, status?: string, processId?: number) {
  const current = top();
  if (!current) return;
  if (processId != null && current.id !== processId) return;
  const next: ProcessState = {
    ...current,
    percent: Math.max(0, Math.min(100, percent)),
    status: status ?? current.status,
    indeterminate: false,
  };
  stack[stack.length - 1] = next;
  notify();
  if (next.mode === 'modal') syncModalDom(next);
}

export function endProcess(processId?: number) {
  if (!stack.length) return;
  const current = top()!;
  if (processId != null && current.id !== processId) {
    const idx = stack.findIndex((s) => s.id === processId);
    if (idx >= 0) stack.splice(idx, 1);
  } else {
    stack.pop();
  }
  const next = top();
  notify();
  if (!next) {
    closeModalIfOurs();
  } else if (next.mode === 'modal') {
    ensureModal(next);
  } else {
    closeModalIfOurs();
  }
}

export type RunProcessOpts = StartProcessOpts & {
  doneStatus?: string;
};

/**
 * Wrap an async action with progress. Always shows the bar; modal for heavy kinds.
 */
export async function runProcess<T>(
  opts: RunProcessOpts,
  fn: (set: (percent: number, status?: string) => void) => Promise<T>,
): Promise<T> {
  const id = startProcess(opts);
  const set = (percent: number, status?: string) => setProcess(percent, status, id);
  try {
    const result = await fn(set);
    set(100, opts.doneStatus || 'Done');
    await new Promise((r) => setTimeout(r, 120));
    return result;
  } finally {
    endProcess(id);
  }
}

/** @deprecated Prefer startProcess / setProcess / endProcess */
export function openLoginProgress() {
  startProcess({
    kind: 'auth',
    title: 'Signing in…',
    status: 'Checking credentials…',
    mode: 'modal',
    percent: 18,
  });
}

/** @deprecated */
export function setLoginProgress(percent: number, status: string) {
  setProcess(percent, status);
}

/** @deprecated */
export function closeLoginProgress() {
  endProcess();
}
