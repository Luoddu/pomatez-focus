// node --test 直接跑 TS 源码时，相对导入必须带扩展名；
// 仓库源码按打包器惯例省略扩展名，这里为测试补 .ts 解析。
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[mc]?[jt]sx?$/.test(specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      /* fall through to default resolution */
    }
  }
  return nextResolve(specifier, context);
}
