export declare function matchesGlob(inputPath: string, pattern: string): boolean;
export declare function getFilePathsFromParameters(tool: string, parameters: unknown): string[];
export declare function isFilePathProtected(filePaths: string[], patterns: string[]): boolean;
export declare function isToolNameProtected(toolName: string, patterns: string[]): boolean;
export declare function isToolProtected(tool: string, input: unknown, tools: string[], files: string[], metadata?: Record<string, unknown>): boolean;
//# sourceMappingURL=protected-patterns.d.ts.map