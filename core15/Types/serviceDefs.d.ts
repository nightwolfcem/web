export interface ServiceDef<T=any> {
  id: string;
  create(app: any): T;
  deps?: string[];
  autoStart?: boolean;
}

/** Map of built-in service definitions used by Tapp boot. */
export const serviceDefs: Record<string, ServiceDef>;
