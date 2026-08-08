// Vitest（node 环境）下的 cloudflare:workers 垫片，仅供玩法包本地测试使用；
// 生产由 workerd 提供真实 DurableObject 基类，wrangler 不会打包本文件。
export class DurableObject<Env = unknown> {
  ctx: DurableObjectState
  env: Env

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }
}
