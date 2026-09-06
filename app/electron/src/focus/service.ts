import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import { Feishu, Request, validateConnection } from "./feishu";

export const request: Request = (method, route, body, token) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "open.feishu.cn",
        path: `/open-apis/${route}`,
        method,
        timeout: 18000,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
          if (text.length > 8 * 1024 * 1024)
            req.destroy(new Error("response too large"));
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(text);
            if (res.statusCode !== 200 || result.code !== 0) {
              reject(
                new Error(
                  `飞书请求未通过（HTTP ${
                    res.statusCode
                  }，代码 ${Number(
                    result.code
                  )}）。请检查权限或稍后重试。`
                )
              );
              return;
            }
            resolve(result);
          } catch {
            reject(new Error("飞书响应无法解析，请稍后重试"));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", () =>
      reject(
        new Error("无法连接飞书，记录已保留在本机；请检查网络后重试")
      )
    );
    if (payload) req.write(payload);
    req.end();
  });
export class FocusService {
  private client?: Feishu;
  private get file() {
    return path.join(app.getPath("userData"), "feishu.enc");
  }
  private cryptoReady() {
    if (
      !safeStorage.isEncryptionAvailable() ||
      (process.platform === "linux" &&
        safeStorage.getSelectedStorageBackend() === "basic_text")
    )
      throw new Error("系统凭证加密不可用，未保存连接信息");
  }
  status() {
    if (!this.client && fs.existsSync(this.file)) {
      this.cryptoReady();
      try {
        this.client = new Feishu(
          JSON.parse(
            safeStorage.decryptString(fs.readFileSync(this.file))
          ),
          request
        );
      } catch {
        throw new Error("本机凭证无法解密，请重新连接飞书");
      }
    }
    return { configured: !!this.client };
  }
  async configure(value: any) {
    this.cryptoReady();
    const next = new Feishu(validateConnection(value), request);
    await next.resolve();
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(
      `${this.file}.tmp`,
      safeStorage.encryptString(JSON.stringify(next.config)),
      { mode: 0o600 }
    );
    fs.renameSync(`${this.file}.tmp`, this.file);
    this.client = next;
    return { configured: true };
  }
  private connected() {
    this.status();
    if (!this.client) throw new Error("请先连接飞书");
    return this.client;
  }
  today() {
    return this.connected().today();
  }
  setup() {
    return this.connected().setup();
  }
  sync(value: any) {
    return this.connected().sync(value);
  }
}
