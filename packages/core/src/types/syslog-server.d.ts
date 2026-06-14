declare module "syslog-server" {
  import { EventEmitter } from "events";

  interface SyslogMessage {
    date: Date;
    host: string;
    message: string;
    protocol: string;
  }

  interface SyslogStartOptions {
    port?: number;
    address?: string;
    exclusive?: boolean;
  }

  class SyslogServer extends EventEmitter {
    start(options?: SyslogStartOptions, callback?: (err?: unknown) => void): Promise<void>;
    stop(callback?: (err?: unknown) => void): Promise<void>;
    isRunning(): boolean;
    on(event: "message", handler: (msg: SyslogMessage) => void): this;
    on(event: "start" | "stop", handler: () => void): this;
    on(event: "error", handler: (err: Error) => void): this;
  }

  export = SyslogServer;
}
