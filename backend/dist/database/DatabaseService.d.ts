export declare class DatabaseService {
    private tables;
    private static instance;
    private constructor();
    static getInstance(): DatabaseService;
    private initializeTables;
    initialize(): Promise<void>;
    run(sql: string, params?: any[]): any;
    get<T = any>(sql: string, params?: any[]): T | undefined;
    all<T = any>(sql: string, params?: any[]): T[];
    transaction<T>(callback: () => T): T;
    close(): void;
    exists(table: string, where: string, params?: any[]): boolean;
    count(table: string, where?: string, params?: any[]): number;
    insert(table: string, data: Record<string, any>): string;
    update(table: string, data: Record<string, any>, where: string, whereParams?: any[]): number;
    delete(table: string, where: string, params?: any[]): number;
}
//# sourceMappingURL=DatabaseService.d.ts.map