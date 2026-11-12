export class FeishuRequestError extends Error {
  constructor(public readonly code: number, status: number | undefined, method: string) {
    const operation = method === "GET" ? "读取" : "写入";
    super(code === 1254607
      ? `飞书数据暂未就绪（${operation}，HTTP ${status}，代码 ${code}），云端可能仍在处理前一次修改。本机记录已保留，可稍后手动同步。`
      : `飞书请求未通过（${operation}，HTTP ${status}，代码 ${code}）。请核对权限或稍后重试。`);
    this.name = "FeishuRequestError";
    // Preserve instanceof when the project's TypeScript target downlevels Error.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Never expose native messages: they may contain URLs, proxy details or data.
const transportReasons: Record<string, string> = {
  CLIENT_TIMEOUT: "请求等待超过18秒",
  ENOTFOUND: "域名解析失败", EAI_AGAIN: "域名解析暂时失败",
  ECONNREFUSED: "连接被拒绝", ECONNRESET: "连接被重置",
  ETIMEDOUT: "连接超时", ENETUNREACH: "网络不可达", EHOSTUNREACH: "目标不可达",
  CERT_HAS_EXPIRED: "TLS证书已过期",
  ERR_TLS_CERT_ALTNAME_INVALID: "TLS证书域名不匹配",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "TLS证书无法验证",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "TLS证书颁发者无法验证",
  DEPTH_ZERO_SELF_SIGNED_CERT: "TLS证书不受信任",
  SELF_SIGNED_CERT_IN_CHAIN: "TLS证书链不受信任",
  EPROTO: "TLS连接失败",
  RESPONSE_TOO_LARGE: "响应超过本机大小限制",
  RESPONSE_INTERRUPTED: "响应接收中断",
  UNKNOWN_TRANSPORT: "连接失败，底层未返回可识别错误码",
};
export class FeishuTransportError extends Error {
  readonly code: string;
  constructor(error: unknown, method: string, route: string) {
    const raw = (error as any)?.code;
    const code = typeof raw === "string" && Object.prototype.hasOwnProperty.call(transportReasons, raw)
      ? raw : "UNKNOWN_TRANSPORT";
    const endpoint = route.startsWith("auth/") ? "访问凭证" :
      /\/fields(?:\?|$)/.test(route) ? "字段定义" :
      /\/records(?:\/|\?|$)/.test(route) ? "表格记录" :
      /\/tables(?:\?|$)/.test(route) ? "表格目录" : "飞书接口";
    const operation = method === "GET" ? "读取" : "写入";
    super(`飞书${transportReasons[code]}（${operation}${endpoint}，${code}）。本机记录已保留。` +
      (method === "GET" || route.startsWith("auth/") ? "可稍后手动同步。" : "本次写入结果尚未确认，请手动同步核对。"));
    this.name = "FeishuTransportError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Retry the caller's reconciliation operation, never an individual HTTP write.
// Only the documented data-not-ready code is eligible; all other failures stop.
export async function recoverDataReady<T>(
  reconcile: () => Promise<T>,
  wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))
): Promise<T> {
  try { return await reconcile(); }
  catch (error) {
    if (!(error instanceof FeishuRequestError) || error.code !== 1254607) throw error;
    await wait(1500);
    return reconcile();
  }
}
