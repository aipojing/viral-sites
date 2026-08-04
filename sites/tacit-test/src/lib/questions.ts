export type QuizId = 'friend' | 'couple'

export interface Question {
  text: string
  options: readonly [string, string, string, string]
}

export interface QuizSet {
  id: QuizId
  name: string
  intro: string
  declaration: string
  questions: readonly Question[]
}

export const QUESTION_COUNT = 10
export const OPTION_COUNT = 4

const FRIEND_QUESTIONS: readonly Question[] = [
  {
    text: '你们俩约饭，最后拍板去哪家店的是？',
    options: ['发起挑战的那位', '接招的这位', '大众点评替你们决定', '拖到饭点随便进一家'],
  },
  {
    text: '你们最常见的聊天开场白是？',
    options: ['「在吗」', '不打招呼直接甩链接', '表情包开路', '「我跟你说！！」'],
  },
  {
    text: '一起吃饭，你们的买单默契是？',
    options: ['抢着买单全武行', '轮流来，心里都有账', 'AA 到小数点后两位', '谁刚发工资谁请'],
  },
  {
    text: '你们的深夜聊天，多半因为什么开场？',
    options: ['有人 emo 了要陪聊', '分享刚刷到的沙雕视频', '游戏开黑三缺一', '睡不着，纯瞎聊'],
  },
  {
    text: '你们一起出门，负责认路的是？',
    options: ['发起挑战的那位', '接招的这位', '手机导航，但经常走反', '不认路，迷路也算行程'],
  },
  {
    text: '你们闹别扭之后，一般怎么和好？',
    options: ['一顿饭的事', '装作无事发生自动复原', '表情包试探破冰', '从没真正闹过别扭'],
  },
  {
    text: '你们的合照通常是什么画风？',
    options: ['摆拍精修九宫格', '沙雕抓拍互黑', '只拍风景不拍人', '想不起上次合照是何时'],
  },
  {
    text: '你们多久联系一次算正常？',
    options: ['一天不聊浑身难受', '三五天一波小高潮', '半个月一次深夜长谈', '半年不联系也不生分'],
  },
  {
    text: '借钱这件事，在你们之间——',
    options: ['张口就借不打借条', '借归借，转账记录两清', '从不谈钱，谈钱伤感情', '谁也没钱，互相哭穷'],
  },
  {
    text: '你们要是一起旅行，最可能因为什么吵起来？',
    options: ['早上谁都叫不醒谁', '一个做攻略一个全程躺', '吃什么能僵持一小时', '吵不起来，各玩各的'],
  },
]

const COUPLE_QUESTIONS: readonly Question[] = [
  {
    text: '第一句「喜欢你」是谁先说的？',
    options: ['发起挑战的那位', '接招的这位', '同时说破，心照不宣', '没人说过，处着处着就在一起了'],
  },
  {
    text: '你们的第一次约会去了哪里？',
    options: ['老老实实吃了顿饭', '看了场电影', '压马路瞎逛', '已经记不清了（危）'],
  },
  {
    text: '吵架之后，通常谁先低头？',
    options: ['发起挑战的那位', '接招的这位', '谁理亏谁低头，很公平', '冷战到自动过期'],
  },
  {
    text: '你们的情侣头像现状是？',
    options: ['一直有，还定期换新', '有过，现在各过各的', '从来没用过，没必要', '一方换了另一方装没看见'],
  },
  {
    text: '你们的作息属于哪一款？',
    options: ['一起早睡的养生型', '一起熬夜的修仙型', '一个熬夜一个夺命催', '各睡各的互不干涉'],
  },
  {
    text: '出门约会，最后站在门口等的是？',
    options: ['发起挑战的那位', '接招的这位', '拖延症对轰，比谁更晚', '不存在等，永远同步出门'],
  },
  {
    text: '你们的纪念日靠谁记住？',
    options: ['发起挑战的那位', '接招的这位', '手机日历，机器比人靠谱', '什么纪念日？（胆子不小）'],
  },
  {
    text: '今晚吃什么，通常怎么定？',
    options: ['发起挑战的那位说了算', '接招的这位说了算', '转盘猜拳等玄学工具', '互相「随便」到饿过头'],
  },
  {
    text: '你们吵过最凶的一架，导火索是？',
    options: ['家务和生活习惯', '打游戏不回消息', '前任或异性朋友', '想不起来，都是小打小闹'],
  },
  {
    text: '关于未来，你们聊得最多的是？',
    options: ['在哪座城市定下来', '先养猫还是先养狗', '攒钱和花钱的拉锯', '只谈当下，未来再说'],
  },
]

export const QUIZZES: Record<QuizId, QuizSet> = {
  friend: {
    id: 'friend',
    name: '好友版',
    intro: '测你和那个总损你的人，到底多懂彼此',
    declaration: '出了 10 道关于你们俩的题，赌你答不对一半',
    questions: FRIEND_QUESTIONS,
  },
  couple: {
    id: 'couple',
    name: '情侣版',
    intro: '测你们是灵魂共振，还是需要聊聊',
    declaration: '出了 10 道关于你们的题，看看你到底有没有走心',
    questions: COUPLE_QUESTIONS,
  },
}
