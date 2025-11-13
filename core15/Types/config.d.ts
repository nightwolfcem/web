/** Global/app config accessors */
export interface Config {
  get<T=any>(path: string, fallback?: T): T;
  set<T=any>(path: string, value: T): void;
  has(path: string): boolean;
}

export const config: Config;
