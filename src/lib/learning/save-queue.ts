/** Preserve edit order when slow network requests finish at different times. */
export function createSaveQueue() {
  let tail = Promise.resolve();
  return {
    enqueue<T>(work: () => Promise<T>): Promise<T> {
      const next = tail.then(work);
      // A failed request must not prevent later drafts from being saved.
      tail = next.then(() => undefined, () => undefined);
      return next;
    },
    settled() { return tail; },
  };
}
