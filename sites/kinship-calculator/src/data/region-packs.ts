// 地域词库是独立、可关闭的数据层。
// 开发态降级：首个地域包还没有拿到可靠资料与两位对应地区母语者的逐条审核，
// 因此保持空数组，界面必须显示「地域包暂未上线」，禁止填入猜测数据。
export interface RegionalLabel {
  relationId: string
  label: string
  region: string
  pronunciation?: string
  sourceIds: readonly string[]
  reviewerRoles: readonly [string, string]
}

export interface RegionPack {
  id: string
  label: string
  entries: readonly RegionalLabel[]
}

export const REGION_PACKS: readonly RegionPack[] = []

export function findRegionPack(regionPackId: string | undefined): RegionPack | undefined {
  if (!regionPackId) return undefined
  return REGION_PACKS.find((pack) => pack.id === regionPackId)
}
