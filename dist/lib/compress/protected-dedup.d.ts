import type { ProtectedContentEntry } from "../state";
import type { SearchContext } from "./types";
export declare function compareProtectedEntries(a: ProtectedContentEntry, b: ProtectedContentEntry, context: SearchContext): number;
export declare function deduplicateProtectedEntries(entries: ProtectedContentEntry[], context: SearchContext): ProtectedContentEntry[];
//# sourceMappingURL=protected-dedup.d.ts.map