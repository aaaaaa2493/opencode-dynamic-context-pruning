/** V1 shares one mutable SessionState between its hooks and tools. */
export declare function createExclusiveRunner(): <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) => (...args: Args) => Promise<Result>;
//# sourceMappingURL=exclusive.d.ts.map