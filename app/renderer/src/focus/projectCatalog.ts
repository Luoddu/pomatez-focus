import type { FocusProject } from "./session";

type Catalog = { sourceKey: string; projects: FocusProject[] };
type Entry = {
  source: string;
  pending: boolean;
  request: Promise<FocusProject[]>;
  fallback?: Promise<FocusProject[]>;
};

// Session-only: no directory data is written to storage. Refresh is explicit.
export class ProjectCatalog {
  private entry: Entry | null = null;

  clear() {
    this.entry = null;
  }

  load(
    source: string,
    read: () => Promise<Catalog>,
    refresh = false
  ): Promise<FocusProject[]> {
    const previous = this.entry?.source === source ? this.entry : null;
    if (previous && !refresh)
      return previous.fallback || previous.request;
    if (previous?.pending) return previous.request;
    const entry: Entry = {
      source,
      pending: true,
      request: Promise.resolve([]),
      fallback: previous?.request,
    };
    this.entry = entry;
    entry.request = Promise.resolve()
      .then(read)
      .then((result) => {
        if (result.sourceKey !== source || this.entry !== entry)
          throw Error("飞书连接已变化，请重新打开表单");
        entry.pending = false;
        entry.fallback = undefined;
        return result.projects;
      })
      .catch((error) => {
        // Failed refresh must not destroy the last usable directory.
        if (this.entry === entry) this.entry = previous;
        throw error;
      });
    return entry.request;
  }
}
