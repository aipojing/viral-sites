import type { Phrase } from '@viral/shared'

// 8 场景 × 5 语气 × 3 条 = 120 条。顺序：按场景分块，块内按语气。
// 修改本文件后必须跑 phrases.lint.test.ts；单条 ≤80 字；占位符仅 {对方称呼}。
export const PHRASES: readonly Phrase[] = [
  // ── 被借钱 · 委婉体面 ──
  { scene: 'jieqian', tone: 'weiwan', text: '{对方称呼}，最近我手头也紧，房贷刚扣完，实在腾不出来，你再想想别的路子？' },
  { scene: 'jieqian', tone: 'weiwan', text: '不是不想帮，是真没有。我这个月的账单都在分期，就不给你添乱了。' },
  { scene: 'jieqian', tone: 'weiwan', text: '我有个原则：关系好的不借钱，怕钱没了朋友也没了。这顿饭我请，钱就不借了。' },
  // ── 被借钱 · 直球硬刚 ──
  { scene: 'jieqian', tone: 'yinggang', text: '不借。我的钱也是一分一分挣的。' },
  { scene: 'jieqian', tone: 'yinggang', text: '借钱免谈。救急可以请你吃饭，救穷我没这个本事。' },
  { scene: 'jieqian', tone: 'yinggang', text: '上次借出去的还没回来，这个口子我已经封了，谁来都一样。' },
  // ── 被借钱 · 发疯文学 ──
  { scene: 'jieqian', tone: 'fafeng', text: '实在抱歉，我的钱在我这儿也是好好的，它不想出远门。' },
  { scene: 'jieqian', tone: 'fafeng', text: '你猜我为什么天天吃食堂？因为我也在等别人借我钱啊！！' },
  { scene: 'jieqian', tone: 'fafeng', text: '我刚问了我的钱包，它说它有社交恐惧症，见到「借」字就晕过去了。' },
  // ── 被借钱 · 文言文 ──
  { scene: 'jieqian', tone: 'wenyan', text: '非吾吝也，实囊中羞涩，爱莫能助。' },
  { scene: 'jieqian', tone: 'wenyan', text: '近日用度维艰，恐负君望，还请另谋良策。' },
  { scene: 'jieqian', tone: 'wenyan', text: '银钱之事，最伤情谊，吾不愿以此试之，君其谅察。' },
  // ── 被借钱 · 职场黑话 ──
  { scene: 'jieqian', tone: 'heihua', text: '这笔资金我评估了下，流动性风险太高，暂时无法立项。' },
  { scene: 'jieqian', tone: 'heihua', text: '我的现金流这个季度要对齐房贷 KPI，实在没有多余预算给到你。' },
  { scene: 'jieqian', tone: 'heihua', text: '借款这个需求我先挂起吧，等我财务状况迭代到 2.0 再拉通对齐。' },

  // ── 被拉群砍价 · 委婉体面 ──
  { scene: 'kanjia', tone: 'weiwan', text: '{对方称呼}，我基本不点这类链接，帮不上你啦，祝你早日砍成！' },
  { scene: 'kanjia', tone: 'weiwan', text: '我这号砍不动，权重太低，别浪费你一个名额，找新用户更划算。' },
  { scene: 'kanjia', tone: 'weiwan', text: '不好意思呀，那个 app 我卸载了，再装一次实在太折腾，就不帮这个忙啦。' },
  // ── 被拉群砍价 · 直球硬刚 ──
  { scene: 'kanjia', tone: 'yinggang', text: '不砍。差的那几毛钱我可以直接转你。' },
  { scene: 'kanjia', tone: 'yinggang', text: '这种链接我从来不点，你就当我没看见。' },
  { scene: 'kanjia', tone: 'yinggang', text: '别发我了，砍价链接一律不点，这是底线。' },
  // ── 被拉群砍价 · 发疯文学 ──
  { scene: 'kanjia', tone: 'fafeng', text: '我上次帮人砍价，最后一刀砍了三年，现在还停在「仅剩0.01%」。' },
  { scene: 'kanjia', tone: 'fafeng', text: '对不起，我的手指点这种链接会过敏，医生说再点就要住院了。' },
  { scene: 'kanjia', tone: 'fafeng', text: '你砍的不是价，是我们十年的友情啊！每点一刀，友情掉一格血！' },
  // ── 被拉群砍价 · 文言文 ──
  { scene: 'kanjia', tone: 'wenyan', text: '此等蝇头小利，徒耗心神，恕不奉陪。' },
  { scene: 'kanjia', tone: 'wenyan', text: '一刀复一刀，刀刀无穷尽，吾不愿陷于此局。' },
  { scene: 'kanjia', tone: 'wenyan', text: '君所求者数文钱耳，吾所失者清净也，恕难从命。' },
  // ── 被拉群砍价 · 职场黑话 ──
  { scene: 'kanjia', tone: 'heihua', text: '帮砍这个动作 ROI 太低了，建议你直接走付费通道，效率更高。' },
  { scene: 'kanjia', tone: 'heihua', text: '我评估了下，我的账号权重赋能不了你这条砍价链路。' },
  { scene: 'kanjia', tone: 'heihua', text: '这个需求不在我本周的排期里，砍价资源已经饱和了，抱歉。' },

  // ── 被安排相亲 · 委婉体面 ──
  { scene: 'xiangqin', tone: 'weiwan', text: '谢谢{对方称呼}惦记，不过我最近想先把自己的日子过明白，缘分的事不急。' },
  { scene: 'xiangqin', tone: 'weiwan', text: '心意我领了，但硬凑的饭局大家都尴尬，等我想见的时候一定主动找您。' },
  { scene: 'xiangqin', tone: 'weiwan', text: '我现在的状态还不适合认识新朋友，等我准备好了，第一个告诉您。' },
  // ── 被安排相亲 · 直球硬刚 ──
  { scene: 'xiangqin', tone: 'yinggang', text: '不去。我单身挺好的，不需要被解决。' },
  { scene: 'xiangqin', tone: 'yinggang', text: '相亲就免了，我的人生大事我自己排期。' },
  { scene: 'xiangqin', tone: 'yinggang', text: '这事别替我操心了，我缺的不是对象，是自己待着的时间。' },
  // ── 被安排相亲 · 发疯文学 ──
  { scene: 'xiangqin', tone: 'fafeng', text: '我这个版本还在内测，不对外发布，婚恋市场请等正式版上线。' },
  { scene: 'xiangqin', tone: 'fafeng', text: '不是我不想去，是对方运气不能这么差，第一次抽卡就抽到我。' },
  { scene: 'xiangqin', tone: 'fafeng', text: '我算过了，我的姻缘在 2049 年，提前见面会引发时空悖论。' },
  // ── 被安排相亲 · 文言文 ──
  { scene: 'xiangqin', tone: 'wenyan', text: '姻缘天定，强求无益，吾且随缘。' },
  { scene: 'xiangqin', tone: 'wenyan', text: '吾心如止水，未起波澜，此会不赴也罢。' },
  { scene: 'xiangqin', tone: 'wenyan', text: '多谢美意，然良缘不在酒席之间，在乎机缘耳。' },
  // ── 被安排相亲 · 职场黑话 ──
  { scene: 'xiangqin', tone: 'heihua', text: '我近期的人生规划里没有婚恋这条业务线，先不开新项目了。' },
  { scene: 'xiangqin', tone: 'heihua', text: '相亲这个场景转化率太低，我决定把精力聚焦在自我成长赛道。' },
  { scene: 'xiangqin', tone: 'heihua', text: '感谢推荐，但这位候选人和我的需求画像不匹配，先不约了。' },

  // ── 被叫周末加班 · 委婉体面 ──
  { scene: 'jiaban', tone: 'weiwan', text: '领导，这周末我家里早有安排实在挪不开，下周我一定把进度赶回来。' },
  { scene: 'jiaban', tone: 'weiwan', text: '这周末确实有事。如果不是特别紧急，我周一早点到，优先处理这块？' },
  { scene: 'jiaban', tone: 'weiwan', text: '周末我已经有约了。线上有急事我可以远程看一眼，到场就实在没办法了。' },
  // ── 被叫周末加班 · 直球硬刚 ──
  { scene: 'jiaban', tone: 'yinggang', text: '周末是我的私人时间，这次不来了。工作日的事我都会保质保量。' },
  { scene: 'jiaban', tone: 'yinggang', text: '加班费和调休有一个我就来，都没有就恕我不奉陪了。' },
  { scene: 'jiaban', tone: 'yinggang', text: '不好意思，周末不上班，这是我入职时就定好的边界。' },
  // ── 被叫周末加班 · 发疯文学 ──
  { scene: 'jiaban', tone: 'fafeng', text: '周六的我和周一的我不是同一个人，你找的那位周一才上班。' },
  { scene: 'jiaban', tone: 'fafeng', text: '我的电脑周末会自动断亲，一开机就蓝屏，它比我先觉醒了。' },
  { scene: 'jiaban', tone: 'fafeng', text: '好的收到！我马上转发给梦里的我，让他加，他闲着也是闲着。' },
  // ── 被叫周末加班 · 文言文 ──
  { scene: 'jiaban', tone: 'wenyan', text: '一张一弛，文武之道。周末不至，望乞海涵。' },
  { scene: 'jiaban', tone: 'wenyan', text: '五日尽忠，两日归隐，此吾之节律，不敢乱也。' },
  { scene: 'jiaban', tone: 'wenyan', text: '身可劳于五日，不可役于七日，周末且容吾自处。' },
  // ── 被叫周末加班 · 职场黑话 ──
  { scene: 'jiaban', tone: 'heihua', text: '这个需求我评估了下优先级，不值得占用周末这种稀缺资源。' },
  { scene: 'jiaban', tone: 'heihua', text: '周末我要对个人生活做复盘和迭代，加班这个排期插不进来了。' },
  { scene: 'jiaban', tone: 'heihua', text: '建议这个事拉个工作日的会对齐一下，周末执行 ROI 不高。' },

  // ── 被推销办卡 · 委婉体面 ──
  { scene: 'banka', tone: 'weiwan', text: '谢谢，我不太需要。你去忙别的顾客吧，别在我身上耽误业绩。' },
  { scene: 'banka', tone: 'weiwan', text: '我办卡从来用不满三次，纯属浪费，就不办啦，谢谢。' },
  { scene: 'banka', tone: 'weiwan', text: '今天先不办，有需要我一定回来找你，你服务挺好的。' },
  // ── 被推销办卡 · 直球硬刚 ──
  { scene: 'banka', tone: 'yinggang', text: '不办，谢谢。你再介绍，我也是这句话。' },
  { scene: 'banka', tone: 'yinggang', text: '我从不办任何预付卡，这是原则问题，跟优惠力度无关。' },
  { scene: 'banka', tone: 'yinggang', text: '省点力气吧，我是那种连传单都不接的人。' },
  // ── 被推销办卡 · 发疯文学 ──
  { scene: 'banka', tone: 'fafeng', text: '办卡？我上一张卡还没用完店就没了，现在看见「充值」俩字就心梗。' },
  { scene: 'banka', tone: 'fafeng', text: '别劝了，我的钱包已经立好遗嘱了，遗产一分都不留给会员卡。' },
  { scene: 'banka', tone: 'fafeng', text: '我命里缺卡，大师算过的，办卡会破我的财运，你忍心吗？' },
  // ── 被推销办卡 · 文言文 ──
  { scene: 'banka', tone: 'wenyan', text: '谢君美意，然吾无此需，不必多言。' },
  { scene: 'banka', tone: 'wenyan', text: '预付之约，以今日之财，博明日之虚诺，吾不为也。' },
  { scene: 'banka', tone: 'wenyan', text: '卡券之惠，看似让利，实为绳索，恕吾不受。' },
  // ── 被推销办卡 · 职场黑话 ──
  { scene: 'banka', tone: 'heihua', text: '这张卡的权益我评估过了，和我的消费场景不匹配，先不办了。' },
  { scene: 'banka', tone: 'heihua', text: '充值属于重资产投入，我目前只做轻量化消费，单次结算就好。' },
  { scene: 'banka', tone: 'heihua', text: '你这套获客话术不错，但我这个用户的付费意愿是负的，换个目标吧。' },

  // ── 被要份子钱 · 委婉体面 ──
  { scene: 'fenziqian', tone: 'weiwan', text: '恭喜恭喜！不过咱们好多年没联系了，婚礼我就不去凑热闹了，祝你们幸福！' },
  { scene: 'fenziqian', tone: 'weiwan', text: '祝新婚快乐！我最近不在本地，就不到场随礼了，改天回去请你喝茶。' },
  { scene: 'fenziqian', tone: 'weiwan', text: '{对方称呼}，咱俩的交情不在礼金上，心意我用别的方式补，祝百年好合！' },
  // ── 被要份子钱 · 直球硬刚 ──
  { scene: 'fenziqian', tone: 'yinggang', text: '咱们上次说话还是五年前，这份子我就不随了，祝幸福。' },
  { scene: 'fenziqian', tone: 'yinggang', text: '不熟的酒席我一律不去也不随，不是针对你，是统一原则。' },
  { scene: 'fenziqian', tone: 'yinggang', text: '份子就免了吧，等你随过我的那天再说。' },
  // ── 被要份子钱 · 发疯文学 ──
  { scene: 'fenziqian', tone: 'fafeng', text: '我随不了一点，我的钱包看到请帖就开始尖叫，现在还在天台蹲着。' },
  { scene: 'fenziqian', tone: 'fafeng', text: '你结婚我随礼，我单身谁随我？我决定给自己随一份，先到先得。' },
  { scene: 'fenziqian', tone: 'fafeng', text: '这个月第四张请帖了，再随下去我就得摆酒回本，到时候你可得来！' },
  // ── 被要份子钱 · 文言文 ──
  { scene: 'fenziqian', tone: 'wenyan', text: '贺仪量力而行，吾力有不逮，唯有心香一瓣，遥祝百年。' },
  { scene: 'fenziqian', tone: 'wenyan', text: '交浅而礼重，非君子所为。吾以贺词代仪，君其纳之。' },
  { scene: 'fenziqian', tone: 'wenyan', text: '十年未通音问，忽奉喜帖。吾唯遥祝，不敢叨扰。' },
  // ── 被要份子钱 · 职场黑话 ──
  { scene: 'fenziqian', tone: 'heihua', text: '咱俩的关系链好久没维护了，这单人情投资我就先不跟了，祝幸福！' },
  { scene: 'fenziqian', tone: 'heihua', text: '随礼预算这个季度已经超支了，你这单我实在排不进去了。' },
  { scene: 'fenziqian', tone: 'heihua', text: '我评估了下咱们的联系频次，这份子钱的 ROI 双方都不高，心意送到！' },

  // ── 被要求帮忙搬家 · 委婉体面 ──
  { scene: 'banjia', tone: 'weiwan', text: '{对方称呼}，那天我真来不了。我出一份搬家师傅的钱，比我这小身板好使多了。' },
  { scene: 'banjia', tone: 'weiwan', text: '我这老腰实在搬不动大件，帮你叫个货拉拉吧，师傅专业还带工具。' },
  { scene: 'banjia', tone: 'weiwan', text: '那天我已经有安排了走不开，等你搬完，我来给你温锅！' },
  // ── 被要求帮忙搬家 · 直球硬刚 ──
  { scene: 'banjia', tone: 'yinggang', text: '搬不了，那天有事。建议直接找搬家公司，一步到位。' },
  { scene: 'banjia', tone: 'yinggang', text: '兄弟情归情，重物归专业，我这次就不上了。' },
  { scene: 'banjia', tone: 'yinggang', text: '不去了。上次帮人搬家腰疼了半个月，我得对自己的腰负责。' },
  // ── 被要求帮忙搬家 · 发疯文学 ──
  { scene: 'banjia', tone: 'fafeng', text: '我的腰椎间盘听到「搬家」两个字已经开始突出了，它比我先拒绝的。' },
  { scene: 'banjia', tone: 'fafeng', text: '大师说我今年不能动土，也不能动别人家的土，冰箱尤其不行。' },
  { scene: 'banjia', tone: 'fafeng', text: '行，我可以去，但我只负责搬空气和喊加油，这两样我是专业的。' },
  // ── 被要求帮忙搬家 · 文言文 ──
  { scene: 'banjia', tone: 'wenyan', text: '吾之筋骨，不堪此任，君宜另请高明。' },
  { scene: 'banjia', tone: 'wenyan', text: '乔迁之喜，吾心往之；搬运之劳，力所不逮。' },
  { scene: 'banjia', tone: 'wenyan', text: '与其借吾之弱躯，不如雇一良夫，事半而功倍。' },
  // ── 被要求帮忙搬家 · 职场黑话 ──
  { scene: 'banjia', tone: 'heihua', text: '搬家这个项目建议外包给专业团队，我这边人力成本高、产出还低。' },
  { scene: 'banjia', tone: 'heihua', text: '我评估了下自己的体力资源池，接不住冰箱这种量级的需求。' },
  { scene: 'banjia', tone: 'heihua', text: '这个活儿和我的能力模型不匹配，我可以赞助一杯奶茶做精神股东。' },

  // ── 被拉去团建 · 委婉体面 ──
  { scene: 'tuanjian', tone: 'weiwan', text: '这次团建我就不去了，家里确实有事。大家玩得开心，照片记得发群里！' },
  { scene: 'tuanjian', tone: 'weiwan', text: '我周末已经有安排了，下次工作日的团建我一定到。' },
  { scene: 'tuanjian', tone: 'weiwan', text: '最近身体不太舒服，剧烈活动参加不了，就不去给大家扫兴啦。' },
  // ── 被拉去团建 · 直球硬刚 ──
  { scene: 'tuanjian', tone: 'yinggang', text: '占用周末的团建我不参加，工作日的我都配合。' },
  { scene: 'tuanjian', tone: 'yinggang', text: '爬山就算了，我的周末只想躺着，这是刚需。' },
  { scene: 'tuanjian', tone: 'yinggang', text: '不去。团建对我来说是加班的一种，还是自费的那种。' },
  // ── 被拉去团建 · 发疯文学 ──
  { scene: 'tuanjian', tone: 'fafeng', text: '团建？我连自己都不想建，你们建吧，建好了发我看看。' },
  { scene: 'tuanjian', tone: 'fafeng', text: '我做了个梦，梦里大巴在盘山路上抛锚了。为了大家的安全，我还是别去了。' },
  { scene: 'tuanjian', tone: 'fafeng', text: '我的 MBTI 是 IIII，纯 I 型，团建半天我得独处一周才能复活。' },
  // ── 被拉去团建 · 文言文 ──
  { scene: 'tuanjian', tone: 'wenyan', text: '众乐乐非吾所长，独乐乐方得其真。诸君尽兴，吾自逍遥。' },
  { scene: 'tuanjian', tone: 'wenyan', text: '山高路远，吾体乏矣，愿诸君尽兴而归。' },
  { scene: 'tuanjian', tone: 'wenyan', text: '聚饮之欢，吾心领之；周末之闲，吾自珍之。' },
  // ── 被拉去团建 · 职场黑话 ──
  { scene: 'tuanjian', tone: 'heihua', text: '这次团建和我的周末规划有排期冲突，名额先释放给更需要的同学。' },
  { scene: 'tuanjian', tone: 'heihua', text: '团建的情绪价值我在工位上已经拿满了，周末就不重复建设了。' },
  { scene: 'tuanjian', tone: 'heihua', text: '我评估了下，这次团建对我的赋能有限，就不占用大巴资源了。' },
]
