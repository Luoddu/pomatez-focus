import { app, safeStorage } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import { createHash } from "crypto";
import { PrefsRepository } from "./preferences";
import {
  Feishu,
  GenerateProgress,
  Request,
  validateConnection,
  connectionKey,
} from "./feishu";

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
    return {
      configured: !!this.client,
      quadrantField: this.client?.quadrantFieldResolved ?? null,
      sourceKey: this.client ? connectionKey(this.client.config) : null,
    };
  }
  async configure(value: any) {
    if(this.preferenceWriting)throw Error("偏好正在同步，请稍后更换连接");
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
  projects() {
    return this.connected().projects();
  }
  async removePlan(value: any) {
    if (this.planWriting)
      throw Error("飞书正在同步，减少操作已保留，可稍后重试");
    this.planWriting = true;
    try {
      return await this.connected().removeQueuedPlan(value);
    } finally {
      this.planWriting = false;
    }
  }
  async createQuickTask(value: any) {
    if (this.planWriting)
      throw Error("飞书正在同步，任务已保留，可稍后重试");
    this.planWriting = true;
    try {
      return await this.connected().createQuickTask(value);
    } finally {
      this.planWriting = false;
    }
  }
  dailyReviews() {
    return this.connected().dailyReviews();
  }
  async recolorRecord(value: any) {
    if (this.planWriting)
      throw Error("飞书正在同步，改色已保留，可稍后重试");
    this.planWriting = true;
    try {
      return await this.connected().recolorRecord(value);
    } finally {
      this.planWriting = false;
    }
  }
  async correctRecord(value: any) {
    if (this.planWriting)
      throw Error("飞书正在同步，修改已保留，可稍后重试");
    this.planWriting = true;
    try {
      return await this.connected().correctRecord(value);
    } finally {
      this.planWriting = false;
    }
  }
  // 计划表写入串行化：生成与 ± 共用一把锁，避免 list-then-write 交错出重复键
  private planWriting = false;
  private adjusting = new Set<string>();
  // 生成进度事件出口：main.ts 在窗口就绪后挂到 webContents.send
  public onGenerateProgress?: (p: GenerateProgress) => void;
  async generateToday() {
    if (this.planWriting) throw new Error("今日番茄正在生成中，请稍候");
    this.planWriting = true;
    try {
      return await this.connected().generateToday(undefined, (p) =>
        this.onGenerateProgress?.(p)
      );
    } finally {
      this.planWriting = false;
    }
  }
  async adjustToday(value: any) {
    const taskId = value?.taskId,
      delta = value?.delta;
    if (typeof taskId !== "string" || (delta !== 1 && delta !== -1))
      throw new Error("番茄调整参数无效");
    if (this.planWriting) throw new Error("正在写入番茄计划，请稍候");
    if (this.adjusting.has(taskId))
      throw new Error("该任务正在调整中，请稍候");
    this.planWriting = true;
    this.adjusting.add(taskId);
    try {
      return await this.connected().adjustToday(taskId, delta);
    } finally {
      this.planWriting = false;
      this.adjusting.delete(taskId);
    }
  }
  // 右键标记完成：与 ±/生成共用计划表写入锁
  async completeToday(value: any) {
    const planId = value?.planId;
    if (typeof planId !== "string") throw new Error("完成参数无效");
    if (this.planWriting) throw new Error("正在写入番茄计划，请稍候");
    this.planWriting = true;
    try {
      return await this.connected().completePlan(planId);
    } finally {
      this.planWriting = false;
    }
  }
  setup() {
    return this.connected().setupPlans();
  }
  backupHistory(value: any) {
    if (!value || !Array.isArray(value.records))
      throw Error("历史备份格式无效");
    const data = JSON.stringify(value);
    if (Buffer.byteLength(data) > 16 * 1024 * 1024)
      throw Error("历史备份过大，请先导出");
    const directory = path.join(app.getPath("userData"), "backups");
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, "before-cloud-history-v1.json");
    if (!fs.existsSync(target))
      fs.writeFileSync(target, data, { flag: "wx", mode: 0o600 });
    return { backedUp: true };
  }
  history() {
    return this.connected().history();
  }
  journal() {
    return this.connected().journal();
  }
  private preferenceWriting=false;
  private preferenceRepositories=new WeakMap<Feishu,PrefsRepository>();
  private preferencesClient(value:any){
    const client=this.connected(),sourceKey=connectionKey(client.config);
    if(!value || value.sourceKey!==sourceKey)throw Error("飞书来源已切换，未同步偏好");
    let repository=this.preferenceRepositories.get(client);
    if(!repository){
      const source=client.preferenceSource();
      const guard=()=>{if(this.client!==client)throw Error("飞书来源已切换");};
      repository=new PrefsRepository({
        root:()=>{guard();return source.root();},
        findTable:async(name,required)=>{guard();return source.findTable(name,required);},
        list:async(route)=>{guard();return source.list(route);},
        call:async(method,route,body)=>{guard();return source.call(method,route,body);},
      },{allowCreate:true,beforeCreate:(root)=>{
        const file=path.join(app.getPath("userData"),"preference-table-creation.json");
        const key=createHash("sha256").update(root).digest("hex");
        let attempts:Record<string,boolean>={};
        if(fs.existsSync(file)){
          if(fs.statSync(file).size>8192)throw Error("偏好建表状态过大，未覆盖");
          attempts=JSON.parse(fs.readFileSync(file,"utf8"));
          if(!attempts || Array.isArray(attempts) || typeof attempts!=="object" || Object.entries(attempts).some(([k,v])=>!/^[a-f0-9]{64}$/.test(k)||v!==true))throw Error("偏好建表状态损坏，未覆盖");
        }
        if(attempts[key])throw Error("偏好表创建结果待确认，请在飞书检查“农场偏好”表后重试同步");
        attempts[key]=true;
        fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+".tmp",JSON.stringify(attempts),{mode:0o600});fs.renameSync(file+".tmp",file);
      }});
      this.preferenceRepositories.set(client,repository);
    }
    return {repository,client,sourceKey};
  }
  async readPreferences(value:any){
    const {repository,client,sourceKey}=this.preferencesClient(value),reply=await repository.read();
    if(this.client!==client)throw Error("飞书来源已切换");
    return {...reply,sourceKey};
  }
  async savePreference(value:any){
    if(this.preferenceWriting)throw Error("偏好正在同步，修改已保留");
    const {repository,client,sourceKey}=this.preferencesClient(value);
    this.preferenceWriting=true;
    try{
      const reply=await repository.save(value.entry);
      if(this.client!==client)throw Error("飞书来源已切换");
      return {...reply,sourceKey};
    }finally{this.preferenceWriting=false;}
  }
  private journalWriting = false;
  async saveJournal(value: any) {
    if (this.journalWriting) throw Error("正在保存日记，请稍后重试");
    this.journalWriting = true;
    try {
      return await this.connected().saveJournal(value);
    } finally {
      this.journalWriting = false;
    }
  }
  async classifyHistory() {
    if (this.planWriting) throw Error("正在写入番茄计划，请稍候");
    this.planWriting = true;
    try {
      this.cryptoReady();
      const client = this.connected();
      const backup = await client.historyFieldBackup();
      const directory = path.join(app.getPath("userData"), "backups");
      fs.mkdirSync(directory, { recursive: true });
      const target = path.join(
        directory,
        `project-colors-before-${backup.sourceKey.slice(0, 16)}.enc`
      );
      if (!fs.existsSync(target))
        fs.writeFileSync(
          target,
          safeStorage.encryptString(JSON.stringify(backup)),
          { flag: "wx", mode: 0o600 }
        );
      return await client.classifyHistory();
    } finally {
      this.planWriting = false;
    }
  }
  async archiveHistory(value: any) {
    if (this.planWriting) throw Error("正在写入番茄计划，请稍候");
    this.planWriting = true;
    try {
      return await this.connected().archiveHistory(value);
    } finally {
      this.planWriting = false;
    }
  }
  // 计划表方向的同步（含确认 N 个番茄的多行完成/补行）与生成、±、
  // 右键完成共用 planWriting 锁，避免 list-then-write 交错出重复键
  async sync(value: any) {
    if (value?.syncTarget !== "plan")
      return this.connected().sync(value);
    if (this.planWriting) throw new Error("正在写入番茄计划，请稍候");
    this.planWriting = true;
    try {
      return await this.connected().sync(value);
    } finally {
      this.planWriting = false;
    }
  }
}
