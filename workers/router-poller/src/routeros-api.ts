import crypto from "crypto";
import net from "net";

interface RouterOsConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  timeoutMs?: number;
}

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  if (length < 0x20_0000) {
    return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  }
  if (length < 0x1000_0000) {
    return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  }
  return Buffer.from([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
}

function decodeLength(buf: Buffer, offset: number): { length: number; size: number } | null {
  if (offset >= buf.length) return null;
  const first = buf[offset];
  if ((first & 0x80) === 0) return { length: first, size: 1 };
  if ((first & 0xc0) === 0x80) {
    if (offset + 1 >= buf.length) return null;
    return { length: ((first & 0x3f) << 8) + buf[offset + 1], size: 2 };
  }
  if ((first & 0xe0) === 0xc0) {
    if (offset + 2 >= buf.length) return null;
    return {
      length: ((first & 0x1f) << 16) + (buf[offset + 1] << 8) + buf[offset + 2],
      size: 3,
    };
  }
  if ((first & 0xf0) === 0xe0) {
    if (offset + 3 >= buf.length) return null;
    return {
      length: ((first & 0x0f) << 24) + (buf[offset + 1] << 16) + (buf[offset + 2] << 8) + buf[offset + 3],
      size: 4,
    };
  }
  if (first === 0xf0) {
    if (offset + 4 >= buf.length) return null;
    return {
      length: (buf[offset + 1] << 24) + (buf[offset + 2] << 16) + (buf[offset + 3] << 8) + buf[offset + 4],
      size: 5,
    };
  }
  return null;
}

function toAttr(words: string[]): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const word of words) {
    if (!word.startsWith("=")) continue;
    const i = word.indexOf("=", 1);
    if (i === -1) continue;
    attrs[word.slice(1, i)] = word.slice(i + 1);
  }
  return attrs;
}

class RouterOsConnection {
  private socket: net.Socket;
  private buffer = Buffer.alloc(0);
  private sentence: string[] = [];
  private queue: string[][] = [];
  private waiters: Array<(sentence: string[]) => void> = [];

  constructor(private readonly options: Required<RouterOsConnectionOptions>) {
    this.socket = new net.Socket();
    this.socket.setNoDelay(true);
    this.socket.setTimeout(this.options.timeoutMs);
    this.socket.on("data", (chunk) => this.onData(chunk));
  }

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      this.socket.once("error", onError);
      this.socket.connect(this.options.port, this.options.host, () => {
        this.socket.off("error", onError);
        resolve();
      });
    });
  }

  close(): void {
    this.socket.destroy();
  }

  async login(): Promise<void> {
    let replies = await this.command(["/login", `=name=${this.options.user}`, `=password=${this.options.password}`]);
    let done = replies.find((r) => r[0] === "!done");
    const trap = replies.find((r) => r[0] === "!trap");
    if (trap) throw new Error(`RouterOS login failed: ${trap.join(" ")}`);

    const ret = done ? toAttr(done)["ret"] : undefined;
    if (!ret) return;

    const challenge = Buffer.from(ret, "hex");
    const hash = crypto.createHash("md5");
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(this.options.password, "utf8"));
    hash.update(challenge);
    const response = `00${hash.digest("hex")}`;

    replies = await this.command(["/login", `=name=${this.options.user}`, `=response=${response}`]);
    done = replies.find((r) => r[0] === "!done");
    if (!done || replies.some((r) => r[0] === "!trap")) {
      throw new Error("RouterOS challenge login failed");
    }
  }

  async command(words: string[]): Promise<string[][]> {
    this.writeSentence(words);
    const replies: string[][] = [];
    for (;;) {
      const sentence = await this.readSentence();
      replies.push(sentence);
      if (sentence[0] === "!done" || sentence[0] === "!trap") break;
    }
    return replies;
  }

  private writeSentence(words: string[]): void {
    const chunks: Buffer[] = [];
    for (const word of words) {
      const bytes = Buffer.from(word, "utf8");
      chunks.push(encodeLength(bytes.length), bytes);
    }
    chunks.push(Buffer.from([0]));
    this.socket.write(Buffer.concat(chunks));
  }

  private async readSentence(): Promise<string[]> {
    if (this.queue.length > 0) return this.queue.shift()!;
    return await new Promise<string[]>((resolve, reject) => {
      const onTimeout = () => {
        cleanup();
        reject(new Error("RouterOS API timeout"));
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        this.socket.off("timeout", onTimeout);
        this.socket.off("error", onError);
      };
      this.socket.once("timeout", onTimeout);
      this.socket.once("error", onError);
      this.waiters.push((sentence) => {
        cleanup();
        resolve(sentence);
      });
    });
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let offset = 0;
    while (offset < this.buffer.length) {
      const decoded = decodeLength(this.buffer, offset);
      if (!decoded) break;
      const wordOffset = offset + decoded.size;
      const end = wordOffset + decoded.length;
      if (end > this.buffer.length) break;
      const word = this.buffer.subarray(wordOffset, end).toString("utf8");
      offset = end;

      if (decoded.length === 0) {
        const sentence = this.sentence;
        this.sentence = [];
        const waiter = this.waiters.shift();
        if (waiter) waiter(sentence);
        else this.queue.push(sentence);
      } else {
        this.sentence.push(word);
      }
    }
    this.buffer = this.buffer.subarray(offset);
  }
}

export interface RouterPppActiveRow {
  username: string;
  mac_address: string;
  assigned_ip: string;
  uptime: string;
}

export async function fetchRouterPppActive(options: RouterOsConnectionOptions): Promise<RouterPppActiveRow[]> {
  const conn = new RouterOsConnection({
    ...options,
    timeoutMs: options.timeoutMs ?? 10_000,
  });
  try {
    await conn.connect();
    await conn.login();
    const replies = await conn.command(["/ppp/active/print", "=.proplist=name,caller-id,address,uptime"]);
    const rows: RouterPppActiveRow[] = [];

    for (const sentence of replies) {
      if (sentence[0] !== "!re") continue;
      const attrs = toAttr(sentence);
      const username = attrs.name?.trim() ?? "";
      const assignedIp = attrs.address?.trim() ?? "";
      if (!username || !assignedIp) continue;
      rows.push({
        username,
        mac_address: attrs["caller-id"]?.trim() ?? "",
        assigned_ip: assignedIp,
        uptime: attrs.uptime?.trim() ?? "",
      });
    }
    return rows;
  } finally {
    conn.close();
  }
}
