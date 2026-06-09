declare module "syslog-server" {
  interface SyslogMessage {
    message: string;
    remote?: { address?: string; port?: number };
  }

  interface SyslogServerInstance {
    on(event: "message", handler: (msg: SyslogMessage) => void): void;
    on(event: "error", handler: (err: Error) => void): void;
    start(options?: { port?: number; host?: string }): void;
  }

  export function createServer(): SyslogServerInstance;
}
