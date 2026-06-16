type MutationListener = () => void;

const listeners = new Set<MutationListener>();

export function onDataMutated(listener: MutationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDataMutated(): void {
  for (const listener of listeners) {
    listener();
  }
}
