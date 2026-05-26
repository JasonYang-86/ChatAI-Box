declare module 'sql.js' {
  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface Database {
    run(sql: string, params?: unknown[] | Record<string, unknown>): void;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  interface Statement {
    bind(params?: unknown[] | Record<string, unknown>): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  }

  interface SqlJsConfig {
    locateFile?: (filename: string) => string;
  }

  export = initSqlJs;
}
