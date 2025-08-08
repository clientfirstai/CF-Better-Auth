import type { BetterAuthInstance } from '@cf-auth/types';

export interface Extension {
  name: string;
  version?: string;
  apply: (instance: BetterAuthInstance) => void;
  dependencies?: string[];
}

export class ExtensionManager {
  private extensions: Map<string, Extension> = new Map();
  private applied: Set<string> = new Set();

  register(extension: Extension): void {
    if (this.extensions.has(extension.name)) {
      console.warn(`Extension ${extension.name} is already registered`);
      return;
    }
    this.extensions.set(extension.name, extension);
  }

  applyExtensions(instance: BetterAuthInstance): void {
    const sorted = this.sortByDependencies();
    
    for (const extension of sorted) {
      if (!this.applied.has(extension.name)) {
        try {
          extension.apply(instance);
          this.applied.add(extension.name);
        } catch (error) {
          console.error(`Failed to apply extension ${extension.name}:`, error);
        }
      }
    }
  }

  private sortByDependencies(): Extension[] {
    const sorted: Extension[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      const extension = this.extensions.get(name);
      if (!extension) return;

      visiting.add(name);

      if (extension.dependencies) {
        for (const dep of extension.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      sorted.push(extension);
    };

    for (const [name] of this.extensions) {
      visit(name);
    }

    return sorted;
  }

  remove(name: string): void {
    this.extensions.delete(name);
    this.applied.delete(name);
  }

  clear(): void {
    this.extensions.clear();
    this.applied.clear();
  }

  getExtensions(): Extension[] {
    return Array.from(this.extensions.values());
  }

  isApplied(name: string): boolean {
    return this.applied.has(name);
  }
}