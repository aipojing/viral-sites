/**
 * 生成热门称呼的可索引解释页。
 * 用法：tsx scripts/generate-relation-pages.ts --out <dir> [--origin <origin>]
 *
 * 安全约束：--out 必须明确传入，且目录 basename 必须为 `relations`，
 * 脚本只会清空并重建该目录，不触碰其他 public 文件。
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { collectRelationPages } from '../src/lib/relation-pages'

function parseArgs(argv: readonly string[]): { out: string; origin: string } {
  const outIndex = argv.indexOf('--out')
  const originIndex = argv.indexOf('--origin')
  const out = outIndex >= 0 ? argv[outIndex + 1] : undefined
  if (!out) {
    throw new Error('缺少 --out 参数：必须明确指定输出目录')
  }
  if (basename(resolve(out)) !== 'relations') {
    throw new Error(`输出目录 basename 必须为 relations，收到：${out}`)
  }
  const origin = originIndex >= 0 ? (argv[originIndex + 1] ?? '') : ''
  return { out: resolve(out), origin }
}

const { out, origin } = parseArgs(process.argv.slice(2))

if (!origin) {
  console.warn('[kinship] 未提供 --origin，canonical 将使用相对路径（开发态降级，部署时应传入正式域名）')
}

const pages = collectRelationPages(origin)

// 只清空重建 relations 目录本身
rmSync(out, { recursive: true, force: true })
for (const page of pages) {
  const target = resolve(out, page.entryId, 'index.html')
  mkdirSync(resolve(out, page.entryId), { recursive: true })
  writeFileSync(target, page.html, 'utf8')
}

console.log(`[kinship] 已生成 ${pages.length} 个称呼解释页 → ${out}`)
