import { assertLinear, parseTestConfig } from '@viral/shared'

const _raw = parseTestConfig({
  meta: {
    slug: 'ban-wei',
    title: '班味浓度检测',
    subtitle: '测测你被工位腌入味了没',
  },
  questions: [
    {
      text: '周日晚上的你，心情曲线长什么样？',
      options: [
        { text: '周日晚上？正是玩得最疯的时候', score: 0 },
        { text: '会想起明天要上班，但转头就忘了', score: 1 },
        { text: '晚饭后开始低落，刷手机到一点舍不得睡', score: 2 },
        { text: '下午三点起，胸口就压着一块名叫「周一」的大石头', score: 3 },
      ],
    },
    {
      text: '「收到」两个字，你一天要打几次？',
      options: [
        { text: '基本不打，我回消息用「好嘞」「OK👌」', score: 0 },
        { text: '群里被点名才打，一天三五次', score: 1 },
        { text: '十次往上，拇指已经形成肌肉记忆', score: 2 },
        { text: '我妈叫我回家吃饭，我回了个「收到」', score: 3 },
      ],
    },
    {
      text: '你对工位上那盆绿植的感情是？',
      options: [
        { text: '没有绿植，工位是用来下班的，不装修', score: 0 },
        { text: '有一盆多肉，心情好的时候浇浇水', score: 1 },
        { text: '每天上班先跟它问好，它是我在公司唯一的朋友', score: 2 },
        { text: '它枯死半个月我才发现——那一刻我居然共情了', score: 3 },
      ],
    },
    {
      text: '电梯门一开，里面站着老板，你会？',
      options: [
        { text: '大方打招呼，顺便聊两句昨晚的比赛', score: 0 },
        { text: '点头微笑，眼神接触不超过两秒', score: 1 },
        { text: '假装看手机看得很专注，其实屏幕是黑的', score: 2 },
        { text: '默默转身走向消防楼梯，就当锻炼身体了', score: 3 },
      ],
    },
    {
      text: '「下班后学习提升自己」，你坚持了几天？',
      options: [
        { text: '一直在坚持，下班是我的第二人生', score: 0 },
        { text: '买了课，看完了第一章，进度条停在 13%', score: 1 },
        { text: '坚持了三天，现在网课账号借给表弟考研用', score: 2 },
        { text: '学习？我在学怎么撑到发工资那天', score: 3 },
      ],
    },
    {
      text: '你的年假一般是怎么用掉的？',
      options: [
        { text: '早就规划好了，机票半年前就订了', score: 0 },
        { text: '攒着，总觉得会有更值得用的时刻', score: 1 },
        { text: '用来搬家、看病、办证——年假是拿来办事的', score: 2 },
        { text: '上次想请假，领导「嗯？」了一声，我说那算了', score: 3 },
      ],
    },
    {
      text: '工作日你的微信步数，一般是什么水平？',
      options: [
        { text: '一万步起步，下班还要去夜跑', score: 0 },
        { text: '五六千，全靠通勤硬凑', score: 1 },
        { text: '稳定两千：工位—茶水间—厕所黄金三角', score: 2 },
        { text: '800 步，系统一度以为我失踪了', score: 3 },
      ],
    },
    {
      text: '听到「团建」两个字，你的生理反应是？',
      options: [
        { text: '太好了！公费吃喝，冲！', score: 0 },
        { text: '吃饭可以，才艺表演就免了', score: 1 },
        { text: '已经开始翻日历找借口：那天我要复查智齿', score: 2 },
        { text: '瞳孔地震。周末团建等于加班，还要笑着自拍', score: 3 },
      ],
    },
  ],
  scoring: {
    mode: 'linear',
    tiers: [
      {
        minScore: 0,
        title: '班味清新',
        percentRange: [0, 19],
        comments: [
          '检测不到班味，你身上还有周末的太阳味',
          '上班对你来说只是副业，主业是生活',
          '建议同事围着你深呼吸两口，就当上过班了',
        ],
        remedy: '解药：保持住。工资是租你时间的，别把灵魂也搭进去',
      },
      {
        minScore: 5,
        title: '微微入味',
        percentRange: [20, 39],
        comments: [
          '刚腌上，还能吃出食材本来的味道',
          '你还会在周五晚上兴奋，说明神经末梢没死透',
          '偶尔说梦话「收到」，但白天还记得自己是谁',
        ],
        remedy: '解药：每周留半天不碰手机不想工作，班味靠晾晒可散',
      },
      {
        minScore: 10,
        title: '腌制中',
        percentRange: [40, 64],
        comments: [
          '入味程度：筷子插得进去，但还没腌到骨头',
          '你已经会用「对齐颗粒度」造句，且不觉得羞耻',
          '照镜子时，偶尔闪过工牌照上那个表情',
        ],
        remedy: '解药：下班路上别再听职场播客了，听歌，大声跟唱那种',
      },
      {
        minScore: 15,
        title: '深度腌入味',
        percentRange: [65, 84],
        comments: [
          '腌透了，切开全是纹路，每一道都是 OKR',
          '点外卖只看「30 分钟达」，因为午休只有 40 分钟',
          '梦里都在开周会，醒来第一反应是找会议纪要',
        ],
        remedy: '解药：请一天假，不出门不干活，专门发呆——这叫脱水回鲜',
      },
      {
        minScore: 20,
        title: '班味十级学者',
        percentRange: [85, 100],
        comments: [
          '你已经不散发班味了，你就是班味本味',
          '血液送检报告：茶多酚 3%，咖啡因 12%，KPI 85%',
          '休假第二天开始心慌，第三天主动打开工作群爬楼',
        ],
        remedy: '解药：把年假一次性用完，去一个没信号的地方，让系统重装',
      },
    ],
  },
})

assertLinear(_raw)
export const banWeiConfig = _raw
