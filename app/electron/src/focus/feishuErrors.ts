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
