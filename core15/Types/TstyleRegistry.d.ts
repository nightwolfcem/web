/**
 * Style registry that injects default editor CSS once.
 */
export interface TstyleRegistry {
  /** Inject default CSS only once per document. */
  injectOnce(doc?: Document): void;

  /** Register custom CSS text to be injected before/after defaults. */
  register(id: string, cssText: string, opts?: { before?: boolean }): void;
}

export const TstyleRegistry: TstyleRegistry;
