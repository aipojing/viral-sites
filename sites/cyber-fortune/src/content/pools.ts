export type FortuneLevel = '大吉' | '中吉' | '小吉' | '平' | '小凶'

export interface LevelMeta {
  id: FortuneLevel
  weight: number
  accent: string
}

export interface Poem {
  id: string
  level: FortuneLevel
  lines: readonly [string, string]
}

export interface PoolItem {
  id: string
  text: string
}

export interface ConflictPair {
  yi: string
  ji: string
}

export interface Pools {
  poems: readonly Poem[]
  yi: readonly PoolItem[]
  ji: readonly PoolItem[]
  people: readonly PoolItem[]
  conflicts: readonly ConflictPair[]
}

export const POOL_VERSION = 'v1'

export const LEVELS: readonly LevelMeta[] = [
  { id: '大吉', weight: 15, accent: '#bc3a23' },
  { id: '中吉', weight: 30, accent: '#b8722d' },
  { id: '小吉', weight: 30, accent: '#3f7a52' },
  { id: '平', weight: 15, accent: '#6f6353' },
  { id: '小凶', weight: 10, accent: '#3e4f88' },
]

export function levelMeta(id: FortuneLevel): LevelMeta {
  const meta = LEVELS.find((l) => l.id === id)
  if (!meta) throw new Error(`unknown level: ${id}`)
  return meta
}

const POEMS: readonly Poem[] = [
  { id: 'p01', level: '大吉', lines: ['摸鱼不见影', '绩效自然来'] },
  { id: 'p02', level: '大吉', lines: ['会议全取消', '工资照样发'] },
  { id: 'p03', level: '大吉', lines: ['老板今出差', '全组静悄悄'] },
  { id: 'p04', level: '大吉', lines: ['需求一夜蒸发', '代码一次跑通'] },
  { id: 'p05', level: '大吉', lines: ['诸事皆顺遂', '红灯自变绿'] },
  { id: 'p06', level: '大吉', lines: ['电梯一按即至', '外卖未点先到'] },
  { id: 'p07', level: '中吉', lines: ['班照常上', '钱照常赚'] },
  { id: 'p08', level: '中吉', lines: ['小事有惊喜', '大事不出错'] },
  { id: 'p09', level: '中吉', lines: ['奶茶半价日', '正好轮到你'] },
  { id: 'p10', level: '中吉', lines: ['群消息九十九', '无一是找你'] },
  { id: 'p11', level: '中吉', lines: ['踩点进工位', '考勤未记迟'] },
  { id: 'p12', level: '中吉', lines: ['午睡无人扰', '醒来无新活'] },
  { id: 'p13', level: '中吉', lines: ['周报凑满行', '领导已读过'] },
  { id: 'p14', level: '中吉', lines: ['地铁有空位', '工位有阳光'] },
  { id: 'p15', level: '中吉', lines: ['今日份好运', '够用到下班'] },
  { id: 'p16', level: '中吉', lines: ['摸鱼有分寸', '进退两从容'] },
  { id: 'p17', level: '小吉', lines: ['食堂加鸡腿', '今日小确幸'] },
  { id: 'p18', level: '小吉', lines: ['快递提前到', '拆前先偷乐'] },
  { id: 'p19', level: '小吉', lines: ['小赚一杯奶茶', '小亏一根头发'] },
  { id: 'p20', level: '小吉', lines: ['消息免打扰', '快乐多三分'] },
  { id: 'p21', level: '小吉', lines: ['运气小好', '别拿去开会'] },
  { id: 'p22', level: '小吉', lines: ['打印机不卡纸', '今日已是上签'] },
  { id: 'p23', level: '小吉', lines: ['微雨不湿鞋', '小事不上心'] },
  { id: 'p24', level: '小吉', lines: ['绿萝发新芽', '你也在长大'] },
  { id: 'p25', level: '小吉', lines: ['耳机电量满格', '通勤脚下生风'] },
  { id: 'p26', level: '小吉', lines: ['小运一桩', '藏好慢用'] },
  { id: 'p27', level: '平', lines: ['不好也不坏', '又是一天过'] },
  { id: 'p28', level: '平', lines: ['今日无事', '便是好事'] },
  { id: 'p29', level: '平', lines: ['风平浪静', '适合发呆'] },
  { id: 'p30', level: '平', lines: ['运势走平线', '心态别学它'] },
  { id: 'p31', level: '平', lines: ['平平无奇', '稳稳当当'] },
  { id: 'p32', level: '平', lines: ['无功也无过', '下班不拖堂'] },
  { id: 'p33', level: '小凶', lines: ['开口易翻车', '全天嗯嗯嗯'] },
  { id: 'p34', level: '小凶', lines: ['水逆不找你', '找你是甲方'] },
  { id: 'p35', level: '小凶', lines: ['行走要小心', '锅从天上来'] },
  { id: 'p36', level: '小凶', lines: ['今日易点名', '摄像头慢开'] },
  { id: 'p37', level: '小凶', lines: ['奶茶必洒', '白衣勿穿'] },
  { id: 'p38', level: '小凶', lines: ['手滑发错群', '撤回来不及'] },
  { id: 'p39', level: '小凶', lines: ['咖啡泼键盘', '文档未保存'] },
  { id: 'p40', level: '小凶', lines: ['小凶仅一日', '明日再来签'] },
]

const YI_POOL: readonly PoolItem[] = [
  { id: 'y01', text: '摸鱼' },
  { id: 'y02', text: '带薪喝水' },
  { id: 'y03', text: '已读不回' },
  { id: 'y04', text: '准点下班' },
  { id: 'y05', text: '带薪如厕' },
  { id: 'y06', text: '午睡十分钟' },
  { id: 'y07', text: '假装忙碌' },
  { id: 'y08', text: '请年假' },
  { id: 'y09', text: '整理工位' },
  { id: 'y10', text: '给绿萝浇水' },
  { id: 'y11', text: '点贵的外卖' },
  { id: 'y12', text: '穿舒服的鞋' },
  { id: 'y13', text: '戴耳机隔音' },
  { id: 'y14', text: '提前去热饭' },
  { id: 'y15', text: '夸同事好看' },
  { id: 'y16', text: '在群里发梗图' },
  { id: 'y17', text: '清理收藏夹' },
  { id: 'y18', text: '发起奶茶拼单' },
  { id: 'y19', text: '早点睡' },
  { id: 'y20', text: '喝热水' },
  { id: 'y21', text: '拍下班的晚霞' },
  { id: 'y22', text: '心算日薪' },
  { id: 'y23', text: '白日做梦' },
  { id: 'y24', text: '原谅自己' },
  { id: 'y25', text: '夸夸自己' },
  { id: 'y26', text: '收藏吃灰' },
  { id: 'y27', text: '重启试试' },
  { id: 'y28', text: '窗边发呆' },
  { id: 'y29', text: '群设免打扰' },
  { id: 'y30', text: '蹭同事零食' },
]

const JI_POOL: readonly PoolItem[] = [
  { id: 'j01', text: '摸鱼' },
  { id: 'j02', text: '准点下班' },
  { id: 'j03', text: '当出头鸟' },
  { id: 'j04', text: '在群里发言' },
  { id: 'j05', text: '点开工作消息' },
  { id: 'j06', text: '主动汇报' },
  { id: 'j07', text: '自愿加班' },
  { id: 'j08', text: '开摄像头' },
  { id: 'j09', text: '回"在吗"' },
  { id: 'j10', text: '秒回消息' },
  { id: 'j11', text: '夸下海口' },
  { id: 'j12', text: '主持会议' },
  { id: 'j13', text: '教人做事' },
  { id: 'j14', text: '接锅' },
  { id: 'j15', text: '对齐颗粒度' },
  { id: 'j16', text: '打探工资' },
  { id: 'j17', text: '跟杠精讲理' },
  { id: 'j18', text: '试新发型' },
  { id: 'j19', text: '穿白衣吃面' },
  { id: 'j20', text: '睡前喝咖啡' },
  { id: 'j21', text: '点最辣的' },
  { id: 'j22', text: '清空购物车' },
  { id: 'j23', text: '看体重秤' },
  { id: 'j24', text: '翻旧聊天记录' },
  { id: 'j25', text: '和导航赌气' },
  { id: 'j26', text: '剪自己刘海' },
  { id: 'j27', text: '深夜发朋友圈' },
  { id: 'j28', text: '手滑点赞' },
  { id: 'j29', text: '和同事抢电梯' },
  { id: 'j30', text: '当众演示' },
]

const PEOPLE_POOL: readonly PoolItem[] = [
  { id: 'r01', text: '食堂阿姨' },
  { id: 'r02', text: '上一个离职的同事' },
  { id: 'r03', text: '电梯里的陌生人' },
  { id: 'r04', text: '快递站小哥' },
  { id: 'r05', text: '楼下保安大叔' },
  { id: 'r06', text: '茶水间偶遇的大佬' },
  { id: 'r07', text: '前台小姐姐' },
  { id: 'r08', text: '修电脑的IT同事' },
  { id: 'r09', text: '总在加班的那位' },
  { id: 'r10', text: '总抢会议室的人' },
  { id: 'r11', text: '群里潜水最深的人' },
  { id: 'r12', text: '朋友圈第一个点赞的人' },
  { id: 'r13', text: '外卖备注里的商家' },
  { id: 'r14', text: '地铁对面打盹的人' },
  { id: 'r15', text: '多年未联系的老同学' },
  { id: 'r16', text: '楼道里遛狗的邻居' },
  { id: 'r17', text: '深夜便利店店员' },
  { id: 'r18', text: '共享文档匿名访客' },
  { id: 'r19', text: '昨天的自己' },
  { id: 'r20', text: '网线对面的网友' },
]

const CONFLICT_PAIRS: readonly ConflictPair[] = [
  { yi: 'y01', ji: 'j01' },
  { yi: 'y04', ji: 'j02' },
  { yi: 'y16', ji: 'j04' },
  { yi: 'y18', ji: 'j04' },
]

export const POOLS: Pools = {
  poems: POEMS,
  yi: YI_POOL,
  ji: JI_POOL,
  people: PEOPLE_POOL,
  conflicts: CONFLICT_PAIRS,
}
