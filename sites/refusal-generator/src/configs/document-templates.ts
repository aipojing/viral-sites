import type { DocumentCell, DocumentKind, DocumentTemplate } from '../lib/document-schema'
import type { DocumentType } from './document-types'

// 开发态审核占位：上线前必须替换为双人盲审的真实标识，否则内容 gate 视为未通过。
const DEV_REVIEW: readonly [string, string] = ['dev-a', 'dev-b']

function t(
  id: string,
  type: DocumentType,
  scene: string,
  audience: string,
  tone: string,
  kind: DocumentKind,
  text: string,
): DocumentTemplate {
  return { id, type, scene, audience, tone, kind, text, reviewedBy: DEV_REVIEW }
}

// ── 正式档：道歉 · 迟到（boss / teacher）──────────────────────────
const LATE_BOSS: readonly DocumentTemplate[] = [
  t('ap-late-boss-sincere-1', 'apology', 'late', 'boss', 'sincere', 'usable',
    '抱歉{对象称呼}，今天{事由}，打乱了上午的安排，是我的问题。[[我会在{日期}前把进度赶回来，]]过程中也会主动同步。'),
  t('ap-late-boss-sincere-2', 'apology', 'late', 'boss', 'sincere', 'usable',
    '{对象称呼}，为今天的{事由}道歉，责任在我，不该让您和团队等我。[[接下来我会{补救动作}，]]避免再出现同样的情况。'),
  t('ap-late-boss-sincere-3', 'apology', 'late', 'boss', 'sincere', 'usable',
    '{对象称呼}，今天{事由}是我的责任，影响了工作节奏，很抱歉。[[我打算{补救动作}，]]有需要我补上的请直接说。'),
  t('ap-late-boss-brief-1', 'apology', 'late', 'boss', 'brief', 'usable',
    '{对象称呼}，抱歉今天{事由}，责任在我，耽误了大家的时间。[[我会{补救动作}，]]稍后同步进展。'),
  t('ap-late-boss-brief-2', 'apology', 'late', 'boss', 'brief', 'usable',
    '{对象称呼}，今天{事由}，跟您说声抱歉。[[我{日期}前补上进度，]]不会让这件事影响交付。'),
  t('ap-late-boss-brief-3', 'apology', 'late', 'boss', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}是我的问题。[[我会{补救动作}。]]之后有情况我第一时间同步。'),
  t('ap-late-boss-gentle-1', 'apology', 'late', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，今天{事由}，让大家多等了，我心里挺过意不去的。[[我会{补救动作}，]]尽量不给您添麻烦。'),
  t('ap-late-boss-gentle-2', 'apology', 'late', 'boss', 'gentle', 'usable',
    '{对象称呼}，想跟您道个歉，今天{事由}，打乱了原本的安排。[[如果可以，我想{补救动作}，]]您看怎么合适。'),
  t('ap-late-boss-gentle-3', 'apology', 'late', 'boss', 'gentle', 'usable',
    '{对象称呼}，今天{事由}，知道给您添麻烦了，很抱歉。[[我会尽快{补救动作}，]]也希望没有太影响您的安排。'),
  t('ap-late-teacher-sincere-1', 'apology', 'late', 'teacher', 'sincere', 'usable',
    '{对象称呼}，抱歉我今天{事由}，影响了课堂秩序，是我的问题。[[我会在{日期}前把落下的内容补上，]]也会注意以后的时间。'),
  t('ap-late-teacher-sincere-2', 'apology', 'late', 'teacher', 'sincere', 'usable',
    '{对象称呼}，为今天{事由}向您道歉，不该打断上课的节奏。[[我已经{补救动作}，]]后面不会再这样了。'),
  t('ap-late-teacher-sincere-3', 'apology', 'late', 'teacher', 'sincere', 'usable',
    '{对象称呼}，今天{事由}是我的责任，很抱歉给您和同学添了麻烦。[[接下来我会{补救动作}，]]请您监督。'),
  t('ap-late-teacher-brief-1', 'apology', 'late', 'teacher', 'brief', 'usable',
    '{对象称呼}，抱歉今天{事由}，是我的问题。[[我会{补救动作}，]]下不为例。'),
  t('ap-late-teacher-brief-2', 'apology', 'late', 'teacher', 'brief', 'usable',
    '{对象称呼}，今天{事由}，跟您说声对不起。[[落下的内容我{日期}前补上，]]不会落下进度。'),
  t('ap-late-teacher-brief-3', 'apology', 'late', 'teacher', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}是我的责任。[[我会{补救动作}。]]之后一定提前安排好时间。'),
  t('ap-late-teacher-gentle-1', 'apology', 'late', 'teacher', 'gentle', 'usable',
    '{对象称呼}，不好意思，今天{事由}，打扰到您上课了，挺抱歉的。[[我会{补救动作}，]]不让大家为我分心。'),
  t('ap-late-teacher-gentle-2', 'apology', 'late', 'teacher', 'gentle', 'usable',
    '{对象称呼}，想跟您道个歉，今天{事由}，打断了课堂。[[要是方便，我想{补救动作}，]]您看可以吗。'),
  t('ap-late-teacher-gentle-3', 'apology', 'late', 'teacher', 'gentle', 'usable',
    '{对象称呼}，今天{事由}，知道给您添了麻烦，很过意不去。[[我会尽快{补救动作}，]]以后一定注意。'),
]

// ── 正式档：道歉 · 忘回消息（partner / friend）────────────────────
const FORGOT_REPLY_PARTNER: readonly DocumentTemplate[] = [
  t('ap-forgot-reply-partner-sincere-1', 'apology', 'forgot-reply', 'partner', 'sincere', 'usable',
    '{对象称呼}，{事由}是我的问题，让你等着没有着落，对不起。[[今晚我会{补救动作}，]]以后重要的消息我会先回。'),
  t('ap-forgot-reply-partner-sincere-2', 'apology', 'forgot-reply', 'partner', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}，我知道等消息的感觉不好受，责任在我。[[我想{补救动作}，]]你愿意的话我们现在就聊。'),
  t('ap-forgot-reply-partner-sincere-3', 'apology', 'forgot-reply', 'partner', 'sincere', 'usable',
    '{对象称呼}，为{事由}认真道歉，不是不在乎你，是我没管好手头的事。[[我会{补救动作}，]]也欢迎你随时提醒我。'),
  t('ap-forgot-reply-partner-brief-1', 'apology', 'forgot-reply', 'partner', 'brief', 'usable',
    '{对象称呼}，对不起，{事由}，是我的错。[[现在补上：{补救动作}。]]'),
  t('ap-forgot-reply-partner-brief-2', 'apology', 'forgot-reply', 'partner', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}，让你久等了。[[我马上{补救动作}，]]这次先记我账上。'),
  t('ap-forgot-reply-partner-brief-3', 'apology', 'forgot-reply', 'partner', 'brief', 'usable',
    '{对象称呼}，{事由}这事我认。[[{日期}前我{补救动作}，]]说到做到。'),
  t('ap-forgot-reply-partner-gentle-1', 'apology', 'forgot-reply', 'partner', 'gentle', 'usable',
    '{对象称呼}，不好意思呀，{事由}，让你一个人对着对话框等了那么久。[[我想{补救动作}，]]别生我气了好不好。'),
  t('ap-forgot-reply-partner-gentle-2', 'apology', 'forgot-reply', 'partner', 'gentle', 'usable',
    '{对象称呼}，{事由}，我猜你等了挺久的，心里挺过意不去的。[[要不要我{补救动作}，]]当作小小赔罪。'),
  t('ap-forgot-reply-partner-gentle-3', 'apology', 'forgot-reply', 'partner', 'gentle', 'usable',
    '抱歉呀{对象称呼}，{事由}，不是故意晾着你的。[[我会{补救动作}，]]以后看到就第一时间回你。'),
  t('ap-forgot-reply-friend-sincere-1', 'apology', 'forgot-reply', 'friend', 'sincere', 'usable',
    '{对象称呼}，{事由}是我的问题，让你等了这么久，对不住。[[我会{补救动作}，]]这次是我掉链子了。'),
  t('ap-forgot-reply-friend-sincere-2', 'apology', 'forgot-reply', 'friend', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}，该回的消息拖到现在，责任在我。[[我想{补救动作}，]]你看什么时候方便。'),
  t('ap-forgot-reply-friend-sincere-3', 'apology', 'forgot-reply', 'friend', 'sincere', 'usable',
    '{对象称呼}，为{事由}道歉，不是不当回事，是我安排乱了。[[{日期}之前我{补救动作}，]]先记我一笔。'),
  t('ap-forgot-reply-friend-brief-1', 'apology', 'forgot-reply', 'friend', 'brief', 'usable',
    '{对象称呼}，对不起，{事由}，我的锅。[[这就补上：{补救动作}。]]'),
  t('ap-forgot-reply-friend-brief-2', 'apology', 'forgot-reply', 'friend', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}，让你久等了。[[我马上{补救动作}，]]回头请你喝东西赔罪。'),
  t('ap-forgot-reply-friend-brief-3', 'apology', 'forgot-reply', 'friend', 'brief', 'usable',
    '{对象称呼}，{事由}这事我认，别往心里去。[[{日期}前我{补救动作}。]]'),
  t('ap-forgot-reply-friend-gentle-1', 'apology', 'forgot-reply', 'friend', 'gentle', 'usable',
    '{对象称呼}，不好意思呀，{事由}，让你对着屏幕等了那么久。[[要不我{补救动作}，]]当赔罪啦。'),
  t('ap-forgot-reply-friend-gentle-2', 'apology', 'forgot-reply', 'friend', 'gentle', 'usable',
    '{对象称呼}，{事由}，我猜你等挺久了，怪不好意思的。[[我{日期}前{补救动作}，]]别跟我计较嘛。'),
  t('ap-forgot-reply-friend-gentle-3', 'apology', 'forgot-reply', 'friend', 'gentle', 'usable',
    '抱歉呀{对象称呼}，{事由}，不是故意不理你的。[[我这就{补救动作}，]]保证下不为例。'),
]

// ── 正式档：道歉 · 忘记重要日子（partner）─────────────────────────
const FORGOT_DAY_PARTNER: readonly DocumentTemplate[] = [
  t('ap-forgot-day-partner-sincere-1', 'apology', 'forgot-day', 'partner', 'sincere', 'usable',
    '{对象称呼}，对不起，{事由}，这么重要的日子我没放在心上，让你失望了。[[我想{补救动作}，]]认真把这个日子补回来。'),
  t('ap-forgot-day-partner-sincere-2', 'apology', 'forgot-day', 'partner', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}是我的疏忽，我理解你会难过，责任全在我。[[我会在{日期}前{补救动作}，]]以后也会提前设好提醒。'),
  t('ap-forgot-day-partner-sincere-3', 'apology', 'forgot-day', 'partner', 'sincere', 'usable',
    '{对象称呼}，为{事由}认真道歉，这不是借口，是我没做好。[[我想{补救动作}，]]也愿意听你说说你的感受。'),
  t('ap-forgot-day-partner-brief-1', 'apology', 'forgot-day', 'partner', 'brief', 'usable',
    '{对象称呼}，对不起，{事由}，是我不上心。[[我想{补救动作}，]]把这个日子补上。'),
  t('ap-forgot-day-partner-brief-2', 'apology', 'forgot-day', 'partner', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}，我认罚。[[{日期}我{补救动作}，]]说到做到。'),
  t('ap-forgot-day-partner-brief-3', 'apology', 'forgot-day', 'partner', 'brief', 'usable',
    '{对象称呼}，{事由}这事是我的错，不辩解。[[我会{补救动作}，]]以后提前提醒自己。'),
  t('ap-forgot-day-partner-gentle-1', 'apology', 'forgot-day', 'partner', 'gentle', 'usable',
    '{对象称呼}，对不起呀，{事由}，我知道这个日子对你很重要，让你一个人过，我心里很不好受。[[让我{补救动作}，]]好不好。'),
  t('ap-forgot-day-partner-gentle-2', 'apology', 'forgot-day', 'partner', 'gentle', 'usable',
    '{对象称呼}，{事由}，怪我粗心，让你失望了。[[要不我们{日期}{补救动作}，]]把这个日子重新过一遍。'),
  t('ap-forgot-day-partner-gentle-3', 'apology', 'forgot-day', 'partner', 'gentle', 'usable',
    '抱歉呀{对象称呼}，{事由}，我保证不是不在乎你。[[我想{补救动作}，]]以后重要日子都提前留出来。'),
]

// ── 正式档：道歉 · 临时爽约（friend）──────────────────────────────
const NO_SHOW_FRIEND: readonly DocumentTemplate[] = [
  t('ap-no-show-friend-sincere-1', 'apology', 'no-show', 'friend', 'sincere', 'usable',
    '{对象称呼}，{事由}是我的问题，让你白做了准备，对不起。[[我想{补救动作}，]]重新约的时间你来定。'),
  t('ap-no-show-friend-sincere-2', 'apology', 'no-show', 'friend', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}，打乱了你的安排，责任在我。[[下次见面我{补救动作}，]]时间地点都听你的。'),
  t('ap-no-show-friend-sincere-3', 'apology', 'no-show', 'friend', 'sincere', 'usable',
    '{对象称呼}，为{事由}认真道歉，临时变卦最消耗人，我知道。[[我会{补救动作}，]]也希望没有太影响你的心情。'),
  t('ap-no-show-friend-brief-1', 'apology', 'no-show', 'friend', 'brief', 'usable',
    '{对象称呼}，对不起，{事由}，是我的问题。[[改天我{补救动作}，]]时间你定。'),
  t('ap-no-show-friend-brief-2', 'apology', 'no-show', 'friend', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}，让你白等了。[[我{日期}前{补救动作}，]]先记我一笔。'),
  t('ap-no-show-friend-brief-3', 'apology', 'no-show', 'friend', 'brief', 'usable',
    '{对象称呼}，{事由}这事我认，不找借口。[[下次我{补救动作}。]]'),
  t('ap-no-show-friend-gentle-1', 'apology', 'no-show', 'friend', 'gentle', 'usable',
    '{对象称呼}，真不好意思，{事由}，知道你为这次见面准备了挺多。[[要不我{补救动作}，]]当作赔罪。'),
  t('ap-no-show-friend-gentle-2', 'apology', 'no-show', 'friend', 'gentle', 'usable',
    '{对象称呼}，{事由}，害你空欢喜一场，怪我。[[我们{日期}{补救动作}，]]这次我一定提前确认好。'),
  t('ap-no-show-friend-gentle-3', 'apology', 'no-show', 'friend', 'gentle', 'usable',
    '抱歉呀{对象称呼}，{事由}，打乱了你的计划。[[让我{补救动作}，]]你随时提要求。'),
]

// ── 正式档：道歉 · 工作遗漏（boss）────────────────────────────────
const MISSED_WORK_BOSS: readonly DocumentTemplate[] = [
  t('ap-missed-work-boss-sincere-1', 'apology', 'missed-work', 'boss', 'sincere', 'usable',
    '{对象称呼}，{事由}是我的责任，给团队添了额外的工作量，很抱歉。[[我会在{日期}前{补救动作}，]]并把检查流程补上。'),
  t('ap-missed-work-boss-sincere-2', 'apology', 'missed-work', 'boss', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}，我先承担下来，不找客观原因。[[我现在就{补救动作}，]]处理完第一时间向您汇报。'),
  t('ap-missed-work-boss-sincere-3', 'apology', 'missed-work', 'boss', 'sincere', 'usable',
    '{对象称呼}，为{事由}道歉，这暴露了我跟进上的漏洞。[[我计划{补救动作}，]]并整理一份清单避免再漏。'),
  t('ap-missed-work-boss-brief-1', 'apology', 'missed-work', 'boss', 'brief', 'usable',
    '{对象称呼}，抱歉，{事由}，责任在我。[[我{日期}前{补救动作}，]]完成后马上同步。'),
  t('ap-missed-work-boss-brief-2', 'apology', 'missed-work', 'boss', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}，是我没盯紧。[[这就{补救动作}，]]今天内给您结果。'),
  t('ap-missed-work-boss-brief-3', 'apology', 'missed-work', 'boss', 'brief', 'usable',
    '{对象称呼}，{事由}这事是我的问题。[[我会{补救动作}，]]并复盘原因避免重犯。'),
  t('ap-missed-work-boss-gentle-1', 'apology', 'missed-work', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，{事由}，给您和团队添麻烦了。[[我尽快{补救动作}，]]有需要我加班补上的您直说。'),
  t('ap-missed-work-boss-gentle-2', 'apology', 'missed-work', 'boss', 'gentle', 'usable',
    '{对象称呼}，{事由}，我心里挺过意不去的，打乱了大家的节奏。[[要不我{补救动作}，]]您看这样处理合适吗。'),
  t('ap-missed-work-boss-gentle-3', 'apology', 'missed-work', 'boss', 'gentle', 'usable',
    '抱歉{对象称呼}，{事由}，知道给您添了负担。[[我会在{日期}前{补救动作}，]]之后也请您多提醒我。'),
]

// ── 正式档：道歉 · 交付延期（client）──────────────────────────────
const DELAYED_CLIENT: readonly DocumentTemplate[] = [
  t('ap-delayed-client-sincere-1', 'apology', 'delayed', 'client', 'sincere', 'usable',
    '{对象称呼}，{事由}，打乱了您这边的计划，是我们的责任。[[最新交付时间是{日期}，期间我们{补救动作}，]]进展会每天同步。'),
  t('ap-delayed-client-sincere-2', 'apology', 'delayed', 'client', 'sincere', 'usable',
    '抱歉{对象称呼}，{事由}，我们没做到承诺的时间，先向您道歉。[[我们已{补救动作}，]]并把影响压到最小。'),
  t('ap-delayed-client-sincere-3', 'apology', 'delayed', 'client', 'sincere', 'usable',
    '{对象称呼}，为{事由}正式道歉，责任在我们，不转嫁客观原因。[[{日期}前我们{补救动作}，]]如有损失也愿意一起商量补偿方案。'),
  t('ap-delayed-client-brief-1', 'apology', 'delayed', 'client', 'brief', 'usable',
    '{对象称呼}，抱歉，{事由}，责任在我们。[[{日期}交付，期间{补救动作}，]]进展随时同步。'),
  t('ap-delayed-client-brief-2', 'apology', 'delayed', 'client', 'brief', 'usable',
    '抱歉{对象称呼}，{事由}。[[我们已{补救动作}，]]最迟{日期}给到结果。'),
  t('ap-delayed-client-brief-3', 'apology', 'delayed', 'client', 'brief', 'usable',
    '{对象称呼}，{事由}这事我们负责到底。[[{补救动作}，]]{日期}前完成交付。'),
  t('ap-delayed-client-gentle-1', 'apology', 'delayed', 'client', 'gentle', 'usable',
    '{对象称呼}，不好意思，{事由}，知道给您这边添了麻烦。[[我们会{补救动作}，]]有任何顾虑都可以直接说。'),
  t('ap-delayed-client-gentle-2', 'apology', 'delayed', 'client', 'gentle', 'usable',
    '{对象称呼}，{事由}，我们也很过意不去。[[想和您商量：{补救动作}，]]您看是否可行。'),
  t('ap-delayed-client-gentle-3', 'apology', 'delayed', 'client', 'gentle', 'usable',
    '抱歉{对象称呼}，{事由}，影响了您的安排。[[{日期}前我们{补救动作}，]]过程中保持沟通透明。'),
]

// ── 正式档：请假 · 身体不适（boss / teacher）──────────────────────
const SICK_BOSS: readonly DocumentTemplate[] = [
  t('lv-sick-boss-sincere-1', 'leave', 'sick', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想请假休息，[[预计{日期}返岗，]]期间的急事我会尽量及时回复。'),
  t('lv-sick-boss-sincere-2', 'leave', 'sick', 'boss', 'sincere', 'usable',
    '{对象称呼}，今天身体不太舒服，因{事由}想请一天假。[[手头的工作我会{补救动作}，]]有紧急情况可以留言给我。'),
  t('lv-sick-boss-sincere-3', 'leave', 'sick', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}需要请假，给团队添麻烦了。[[我会{补救动作}，]][[预计{日期}恢复返岗。]]'),
  t('lv-sick-boss-brief-1', 'leave', 'sick', 'boss', 'brief', 'usable',
    '{对象称呼}，我因{事由}今天请假一天。[[急事留言，我会{补救动作}。]]'),
  t('lv-sick-boss-brief-2', 'leave', 'sick', 'boss', 'brief', 'usable',
    '{对象称呼}，今天{事由}，需要请假休息。[[预计{日期}返岗，]]工作已交接妥当。'),
  t('lv-sick-boss-brief-3', 'leave', 'sick', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}请假一天，给您添麻烦了。[[我会{补救动作}，]]返岗后马上跟进。'),
  t('lv-sick-boss-gentle-1', 'leave', 'sick', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，今天{事由}，想请一天假缓一缓。[[要紧的事我会{补救动作}，]]不耽误进度。'),
  t('lv-sick-boss-gentle-2', 'leave', 'sick', 'boss', 'gentle', 'usable',
    '{对象称呼}，有点抱歉临时开口，我因{事由}想请假。[[预计{日期}回来，]]期间有急事随时找我。'),
  t('lv-sick-boss-gentle-3', 'leave', 'sick', 'boss', 'gentle', 'usable',
    '{对象称呼}，今天身体不太争气，{事由}，想请假休息一下。[[我会提前{补救动作}，]]尽量少给大家添麻烦。'),
  t('lv-sick-teacher-sincere-1', 'leave', 'sick', 'teacher', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想请假，[[预计{日期}返校，]]落下的课程我会自己补上。'),
  t('lv-sick-teacher-sincere-2', 'leave', 'sick', 'teacher', 'sincere', 'usable',
    '{对象称呼}，今天身体不舒服，因{事由}需要请假。[[我会{补救动作}，]]不落下学习进度。'),
  t('lv-sick-teacher-sincere-3', 'leave', 'sick', 'teacher', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想请一天假，给您添麻烦了。[[返校后我会{补救动作}，]]谢谢老师理解。'),
  t('lv-sick-teacher-brief-1', 'leave', 'sick', 'teacher', 'brief', 'usable',
    '{对象称呼}，我因{事由}今天请假。[[落下的内容我会{补救动作}。]]'),
  t('lv-sick-teacher-brief-2', 'leave', 'sick', 'teacher', 'brief', 'usable',
    '{对象称呼}，今天{事由}，需要请假一天。[[预计{日期}返校，]]作业我会按时交。'),
  t('lv-sick-teacher-brief-3', 'leave', 'sick', 'teacher', 'brief', 'usable',
    '{对象称呼}，因{事由}请假，抱歉打扰。[[我会{补救动作}，]]谢谢老师。'),
  t('lv-sick-teacher-gentle-1', 'leave', 'sick', 'teacher', 'gentle', 'usable',
    '{对象称呼}，不好意思，今天{事由}，想请一天假休息。[[落下的课我会{补救动作}，]]不让进度掉队。'),
  t('lv-sick-teacher-gentle-2', 'leave', 'sick', 'teacher', 'gentle', 'usable',
    '{对象称呼}，有点抱歉临时请假，我因{事由}需要休息。[[预计{日期}回来，]]谢谢老师理解。'),
  t('lv-sick-teacher-gentle-3', 'leave', 'sick', 'teacher', 'gentle', 'usable',
    '{对象称呼}，今天身体不太舒服，{事由}，想跟您请个假。[[我会尽快{补救动作}，]]尽量少添麻烦。'),
]

// ── 正式档：请假 · 个人事务（boss）────────────────────────────────
const PERSONAL_BOSS: readonly DocumentTemplate[] = [
  t('lv-personal-boss-sincere-1', 'leave', 'personal', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}需要请假处理，[[预计{日期}返岗，]]期间的重要事项我会提前安排好。'),
  t('lv-personal-boss-sincere-2', 'leave', 'personal', 'boss', 'sincere', 'usable',
    '{对象称呼}，想请一天假，因{事由}需要本人到场处理。[[我会{补救动作}，]]尽量不影响团队进度。'),
  t('lv-personal-boss-sincere-3', 'leave', 'personal', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想申请请假，给工作安排添麻烦了。[[我会{补救动作}，]][[预计{日期}恢复正常节奏。]]'),
  t('lv-personal-boss-brief-1', 'leave', 'personal', 'boss', 'brief', 'usable',
    '{对象称呼}，我因{事由}需要请假一天。[[工作已安排妥当，{补救动作}。]]'),
  t('lv-personal-boss-brief-2', 'leave', 'personal', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}请假，[[预计{日期}返岗，]]急事可以留言给我。'),
  t('lv-personal-boss-brief-3', 'leave', 'personal', 'boss', 'brief', 'usable',
    '{对象称呼}，今天因{事由}需要请假处理。[[我会{补救动作}，]]返岗后第一时间跟进。'),
  t('lv-personal-boss-gentle-1', 'leave', 'personal', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，我因{事由}想请一天假。[[要紧的工作我会{补救动作}，]]不给大家添乱。'),
  t('lv-personal-boss-gentle-2', 'leave', 'personal', 'boss', 'gentle', 'usable',
    '{对象称呼}，有点抱歉临时开口，因{事由}需要请假。[[预计{日期}回来，]]期间保持联系畅通。'),
  t('lv-personal-boss-gentle-3', 'leave', 'personal', 'boss', 'gentle', 'usable',
    '{对象称呼}，因{事由}想跟您请个假，给您添麻烦了。[[我会提前{补救动作}，]]谢谢理解。'),
]

// ── 正式档：请假 · 家庭事务（boss）────────────────────────────────
const FAMILY_BOSS: readonly DocumentTemplate[] = [
  t('lv-family-boss-sincere-1', 'leave', 'family', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}需要请假处理，[[预计{日期}返岗，]]期间紧急事项我会及时响应。'),
  t('lv-family-boss-sincere-2', 'leave', 'family', 'boss', 'sincere', 'usable',
    '{对象称呼}，家里有些事情需要我到场，因{事由}想请假。[[我会{补救动作}，]]把对工作的影响降到最低。'),
  t('lv-family-boss-sincere-3', 'leave', 'family', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想申请请假，给团队添麻烦了。[[我会{补救动作}，]][[预计{日期}回来补上进度。]]'),
  t('lv-family-boss-brief-1', 'leave', 'family', 'boss', 'brief', 'usable',
    '{对象称呼}，我因{事由}需要请假。[[预计{日期}返岗，]]工作已交接好。'),
  t('lv-family-boss-brief-2', 'leave', 'family', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}请假一天，抱歉临时开口。[[我会{补救动作}。]]'),
  t('lv-family-boss-brief-3', 'leave', 'family', 'boss', 'brief', 'usable',
    '{对象称呼}，今天因{事由}需要请假处理。[[有急事留言，我会{补救动作}。]]'),
  t('lv-family-boss-gentle-1', 'leave', 'family', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，家里临时有事，因{事由}想请一天假。[[要紧的事我会{补救动作}，]]不耽误进度。'),
  t('lv-family-boss-gentle-2', 'leave', 'family', 'boss', 'gentle', 'usable',
    '{对象称呼}，有点抱歉，因{事由}需要请假回去处理。[[预计{日期}回来，]]期间随时可以联系我。'),
  t('lv-family-boss-gentle-3', 'leave', 'family', 'boss', 'gentle', 'usable',
    '{对象称呼}，因{事由}想跟您请个假，给您添麻烦了。[[我会提前{补救动作}，]]谢谢理解。'),
]

// ── 正式档：请假 · 临时调休（boss）────────────────────────────────
const COMP_OFF_BOSS: readonly DocumentTemplate[] = [
  t('lv-comp-off-boss-sincere-1', 'leave', 'comp-off', 'boss', 'sincere', 'usable',
    '{对象称呼}，前段时间加班较多，因{事由}想申请调休，[[预计{日期}返岗，]]工作已提前安排妥当。'),
  t('lv-comp-off-boss-sincere-2', 'leave', 'comp-off', 'boss', 'sincere', 'usable',
    '{对象称呼}，因{事由}想用调休请一天假。[[我会{补救动作}，]]确保手头事项不受影响。'),
  t('lv-comp-off-boss-sincere-3', 'leave', 'comp-off', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}申请调休，给安排添麻烦了。[[我会{补救动作}，]][[预计{日期}正常返岗。]]'),
  t('lv-comp-off-boss-brief-1', 'leave', 'comp-off', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}申请调休一天。[[工作已交接，{补救动作}。]]'),
  t('lv-comp-off-boss-brief-2', 'leave', 'comp-off', 'boss', 'brief', 'usable',
    '{对象称呼}，想用调休请一天假，因{事由}。[[预计{日期}返岗，]]急事留言。'),
  t('lv-comp-off-boss-brief-3', 'leave', 'comp-off', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}申请调休。[[我会{补救动作}，]]返岗后马上跟进进度。'),
  t('lv-comp-off-boss-gentle-1', 'leave', 'comp-off', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，因{事由}想用调休歇一天。[[要紧的事我会{补救动作}，]]不耽误团队节奏。'),
  t('lv-comp-off-boss-gentle-2', 'leave', 'comp-off', 'boss', 'gentle', 'usable',
    '{对象称呼}，想跟您申请一天调休，因{事由}。[[预计{日期}回来，]]期间保持联系。'),
  t('lv-comp-off-boss-gentle-3', 'leave', 'comp-off', 'boss', 'gentle', 'usable',
    '{对象称呼}，因{事由}想调休一天，给您添麻烦了。[[我会提前{补救动作}，]]谢谢理解。'),
]

// ── 正式档：请假 · 需要短暂休息（boss）────────────────────────────
const REST_BOSS: readonly DocumentTemplate[] = [
  t('lv-rest-boss-sincere-1', 'leave', 'rest', 'boss', 'sincere', 'usable',
    '{对象称呼}，最近状态有些透支，因{事由}想请一天假调整。[[预计{日期}返岗，]]紧急事项我会保持响应。'),
  t('lv-rest-boss-sincere-2', 'leave', 'rest', 'boss', 'sincere', 'usable',
    '{对象称呼}，因{事由}想请假休整一下，避免状态继续下滑影响工作。[[我会{补救动作}，]]回来以更稳定的状态投入。'),
  t('lv-rest-boss-sincere-3', 'leave', 'rest', 'boss', 'sincere', 'usable',
    '{对象称呼}，我因{事由}想申请一天假期调整节奏。[[我会{补救动作}，]][[预计{日期}返岗。]]'),
  t('lv-rest-boss-brief-1', 'leave', 'rest', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}想请一天假调整状态。[[预计{日期}返岗，]]工作已安排好。'),
  t('lv-rest-boss-brief-2', 'leave', 'rest', 'boss', 'brief', 'usable',
    '{对象称呼}，最近有些透支，因{事由}请假一天。[[我会{补救动作}，]]急事留言。'),
  t('lv-rest-boss-brief-3', 'leave', 'rest', 'boss', 'brief', 'usable',
    '{对象称呼}，因{事由}想休整一天。[[{日期}返岗，期间{补救动作}。]]'),
  t('lv-rest-boss-gentle-1', 'leave', 'rest', 'boss', 'gentle', 'usable',
    '{对象称呼}，不好意思，最近状态不太好，因{事由}想请一天假缓缓。[[要紧的事我会{补救动作}，]]不耽误进度。'),
  t('lv-rest-boss-gentle-2', 'leave', 'rest', 'boss', 'gentle', 'usable',
    '{对象称呼}，想跟您请一天假，因{事由}需要调整一下。[[预计{日期}回来，]]谢谢理解。'),
  t('lv-rest-boss-gentle-3', 'leave', 'rest', 'boss', 'gentle', 'usable',
    '{对象称呼}，因{事由}想请一天假休整，给您添麻烦了。[[我会提前{补救动作}，]]回来满血复活。'),
]

// ── 玩梗档：文言文 / 发疯文学（明确标注 joke，仅供娱乐）────────────
const JOKES: readonly DocumentTemplate[] = [
  // late × boss
  t('ap-late-boss-wenyan-1', 'apology', 'late', 'boss', 'wenyan', 'joke',
    '{对象称呼}容禀：今晨{事由}，实乃在下之过，敢不躬身自省。[[愿于{日期}前{补救动作}，]]伏惟海涵。'),
  t('ap-late-boss-wenyan-2', 'apology', 'late', 'boss', 'wenyan', 'joke',
    '启者{对象称呼}：{事由}一事，咎由自取，无颜置辩。[[谨当{补救动作}，]]以观后效，尚祈见谅。'),
  t('ap-late-boss-wenyan-3', 'apology', 'late', 'boss', 'wenyan', 'joke',
    '{对象称呼}钧鉴：今日{事由}，有负重托，惶恐之至。[[拟{补救动作}，]]以赎前愆，静候裁处。'),
  t('ap-late-boss-fafeng-1', 'apology', 'late', 'boss', 'fafeng', 'joke',
    '{对象称呼}！！我迟到了我承认！！{事由}把我整个人都吞了！！[[我今天一定{补救动作}！！]]别开除我！！'),
  t('ap-late-boss-fafeng-2', 'apology', 'late', 'boss', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，我的闹钟背叛了我，我和它已经断绝关系了。[[我现在立刻{补救动作}！]]'),
  t('ap-late-boss-fafeng-3', 'apology', 'late', 'boss', 'fafeng', 'joke',
    '{对象称呼}，{事由}这件事，我已经在心里把自己骂了八百遍。[[请再给我一次机会，我{补救动作}！]]'),
  // forgot-reply × friend
  t('ap-forgot-reply-friend-wenyan-1', 'apology', 'forgot-reply', 'friend', 'wenyan', 'joke',
    '{对象称呼}足下：{事由}，实为鄙人之怠慢，非敢相轻也。[[愿{补救动作}，]]以表寸诚，幸勿见怪。'),
  t('ap-forgot-reply-friend-wenyan-2', 'apology', 'forgot-reply', 'friend', 'wenyan', 'joke',
    '致{对象称呼}：音讯久稽，{事由}，皆吾之过也。[[今当{补救动作}，]]聊赎怠慢之罪。'),
  t('ap-forgot-reply-friend-wenyan-3', 'apology', 'forgot-reply', 'friend', 'wenyan', 'joke',
    '{对象称呼}如晤：{事由}一事，扪心有愧，不敢饰非。[[谨拟{补救动作}，]]伏候回音。'),
  t('ap-forgot-reply-friend-fafeng-1', 'apology', 'forgot-reply', 'friend', 'fafeng', 'joke',
    '{对象称呼}！！{事由}是我的错！！我的大脑刚才离线了！！[[现在我立刻{补救动作}！！]]别拉黑我！！'),
  t('ap-forgot-reply-friend-fafeng-2', 'apology', 'forgot-reply', 'friend', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，我已经在屏幕前跪着反省了十分钟。[[请让我{补救动作}赎罪！]]'),
  t('ap-forgot-reply-friend-fafeng-3', 'apology', 'forgot-reply', 'friend', 'fafeng', 'joke',
    '{对象称呼}，{事由}这事我能解释：手机它先动的手！[[但责任我全担，我{补救动作}！]]'),
  // forgot-day × partner
  t('ap-forgot-day-partner-wenyan-1', 'apology', 'forgot-day', 'partner', 'wenyan', 'joke',
    '{对象称呼}芳鉴：{事由}，实乃在下昏聩，罪不可逭。[[愿择{日期}{补救动作}，]]以补前憾，伏乞垂怜。'),
  t('ap-forgot-day-partner-wenyan-2', 'apology', 'forgot-day', 'partner', 'wenyan', 'joke',
    '启者{对象称呼}：良辰竟忘，{事由}，抚膺自愧。[[谨当{补救动作}，]]聊表寸心，尚祈宽宥。'),
  t('ap-forgot-day-partner-wenyan-3', 'apology', 'forgot-day', 'partner', 'wenyan', 'joke',
    '{对象称呼}青览：{事由}之失，责在愚钝，无可推诿。[[拟{补救动作}，]]以赎健忘之愆。'),
  t('ap-forgot-day-partner-fafeng-1', 'apology', 'forgot-day', 'partner', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我恨我自己！！[[我要{补救动作}，]]把这个日子连本带利补回来！！'),
  t('ap-forgot-day-partner-fafeng-2', 'apology', 'forgot-day', 'partner', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，我的日历和脑子一起离家出走了，我已经把它们抓回来了。[[罚我{补救动作}！]]'),
  t('ap-forgot-day-partner-fafeng-3', 'apology', 'forgot-day', 'partner', 'fafeng', 'joke',
    '{对象称呼}，{事由}这事没有借口，我现在就去面壁。[[面壁结束我{补救动作}，]]请给我戴罪立功的机会！'),
  // no-show × friend
  t('ap-no-show-friend-wenyan-1', 'apology', 'no-show', 'friend', 'wenyan', 'joke',
    '{对象称呼}足下：{事由}，爽约之罪，百口莫辩。[[愿{补救动作}，]]另备薄礼，以谢久候。'),
  t('ap-no-show-friend-wenyan-2', 'apology', 'no-show', 'friend', 'wenyan', 'joke',
    '致{对象称呼}：既约而不至，{事由}，实吾之失信也。[[谨当{补救动作}，]]以全交谊。'),
  t('ap-no-show-friend-wenyan-3', 'apology', 'no-show', 'friend', 'wenyan', 'joke',
    '{对象称呼}如晤：{事由}一事，愧对盛情，无地自容。[[拟{补救动作}，]]伏惟包涵。'),
  t('ap-no-show-friend-fafeng-1', 'apology', 'no-show', 'friend', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我放了你鸽子，我本人已经被我本人谴责了！！[[下次我一定{补救动作}！！]]'),
  t('ap-no-show-friend-fafeng-2', 'apology', 'no-show', 'friend', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，我现在羞愧得像个漏气的气球。[[请让我{补救动作}重新充气！]]'),
  t('ap-no-show-friend-fafeng-3', 'apology', 'no-show', 'friend', 'fafeng', 'joke',
    '{对象称呼}，{事由}这事我跪着道歉！[[惩罚方案随你定，我先提议{补救动作}！]]'),
  // missed-work × boss
  t('ap-missed-work-boss-wenyan-1', 'apology', 'missed-work', 'boss', 'wenyan', 'joke',
    '{对象称呼}钧鉴：{事由}，疏忽之责，无可宽贷。[[愿于{日期}前{补救动作}，]]以观后效。'),
  t('ap-missed-work-boss-wenyan-2', 'apology', 'missed-work', 'boss', 'wenyan', 'joke',
    '启者{对象称呼}：职有所怠，{事由}，咎在微躯。[[谨当{补救动作}，]]以赎疏失。'),
  t('ap-missed-work-boss-wenyan-3', 'apology', 'missed-work', 'boss', 'wenyan', 'joke',
    '{对象称呼}容禀：{事由}之失，实为在下察事不周。[[拟{补救动作}，]]静候责罚。'),
  t('ap-missed-work-boss-fafeng-1', 'apology', 'missed-work', 'boss', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我的待办清单它造反了！！[[但我已经镇压了它，正在{补救动作}！！]]'),
  t('ap-missed-work-boss-fafeng-2', 'apology', 'missed-work', 'boss', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，我现在火力全开补救中！[[{日期}之前{补救动作}，]]完不成我就再开一炮！'),
  t('ap-missed-work-boss-fafeng-3', 'apology', 'missed-work', 'boss', 'fafeng', 'joke',
    '{对象称呼}，{事由}这事，我已经把自己调成了补救模式。[[{补救动作}！]]请看我表演！'),
  // delayed × client
  t('ap-delayed-client-wenyan-1', 'apology', 'delayed', 'client', 'wenyan', 'joke',
    '{对象称呼}台鉴：{事由}，有违先约，惭悚交集。[[拟于{日期}{补救动作}，]]以践前诺。'),
  t('ap-delayed-client-wenyan-2', 'apology', 'delayed', 'client', 'wenyan', 'joke',
    '致{对象称呼}：交期有稽，{事由}，责在我方，不敢委咎。[[谨当{补救动作}，]]以副雅望。'),
  t('ap-delayed-client-wenyan-3', 'apology', 'delayed', 'client', 'wenyan', 'joke',
    '{对象称呼}惠鉴：{事由}一事，深感抱歉，伏惟宽限。[[已{补救动作}，]]克期告成。'),
  t('ap-delayed-client-fafeng-1', 'apology', 'delayed', 'client', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我们已经在疯狂赶工了，键盘都冒烟了！！[[{日期}之前{补救动作}！！]]'),
  t('ap-delayed-client-fafeng-2', 'apology', 'delayed', 'client', 'fafeng', 'joke',
    '对不起{对象称呼}，{事由}，进度条它刚才卡住了，我们已经把它骂醒了。[[马上{补救动作}！]]'),
  t('ap-delayed-client-fafeng-3', 'apology', 'delayed', 'client', 'fafeng', 'joke',
    '{对象称呼}，{事由}这事我们全员立正挨打。[[补救方案：{补救动作}！]]绝不找借口！'),
  // sick × boss
  t('lv-sick-boss-wenyan-1', 'leave', 'sick', 'boss', 'wenyan', 'joke',
    '{对象称呼}钧鉴：偶染微恙，{事由}，恐难勉力供职。[[拟静养至{日期}，]]愈当即刻返岗。'),
  t('lv-sick-boss-wenyan-2', 'leave', 'sick', 'boss', 'wenyan', 'joke',
    '启者{对象称呼}：贱体欠安，{事由}，乞假一日，以资调摄。[[期间{补救动作}，]]不敢误公。'),
  t('lv-sick-boss-wenyan-3', 'leave', 'sick', 'boss', 'wenyan', 'joke',
    '{对象称呼}容禀：今晨{事由}，力有未逮，伏乞准假。[[预计{日期}康复销假，]]伏候钧裁。'),
  t('lv-sick-boss-fafeng-1', 'leave', 'sick', 'boss', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我的血条已经见底了！！[[申请回城休整一天，{日期}满血复活回来！！]]'),
  t('lv-sick-boss-fafeng-2', 'leave', 'sick', 'boss', 'fafeng', 'joke',
    '报告{对象称呼}，{事由}，本人的运行系统需要重启。[[请假一天，{补救动作}，]]重启后性能更佳！'),
  t('lv-sick-boss-fafeng-3', 'leave', 'sick', 'boss', 'fafeng', 'joke',
    '{对象称呼}，{事由}，我再撑着上班就要当场表演瘫倒了。[[请假一天保平安，{补救动作}！]]'),
  // personal × boss
  t('lv-personal-boss-wenyan-1', 'leave', 'personal', 'boss', 'wenyan', 'joke',
    '{对象称呼}钧鉴：有私事亟待亲理，{事由}，伏乞准假一日。[[拟{日期}返岗，]]公私两不误。'),
  t('lv-personal-boss-wenyan-2', 'leave', 'personal', 'boss', 'wenyan', 'joke',
    '启者{对象称呼}：{事由}，须躬身往办，乞假以行。[[期间{补救动作}，]]不敢失联。'),
  t('lv-personal-boss-wenyan-3', 'leave', 'personal', 'boss', 'wenyan', 'joke',
    '{对象称呼}容禀：俗务缠身，{事由}，恳请告假。[[预计{日期}销假，]]伏候裁夺。'),
  t('lv-personal-boss-fafeng-1', 'leave', 'personal', 'boss', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！生活正在对我发动突袭！！[[我需要请假一天去前线处理，{日期}凯旋！！]]'),
  t('lv-personal-boss-fafeng-2', 'leave', 'personal', 'boss', 'fafeng', 'joke',
    '报告{对象称呼}，{事由}，本人的私事进度条已经报警了。[[请假一天处理，{补救动作}！]]'),
  t('lv-personal-boss-fafeng-3', 'leave', 'personal', 'boss', 'fafeng', 'joke',
    '{对象称呼}，{事由}，这件事只有我本人到场才能镇住场面。[[请假一天，{日期}回来继续发光发热！]]'),
  // rest × boss
  t('lv-rest-boss-wenyan-1', 'leave', 'rest', 'boss', 'wenyan', 'joke',
    '{对象称呼}钧鉴：连日案牍劳形，{事由}，乞假一日以养精神。[[拟{日期}返岗，]]再效驰驱。'),
  t('lv-rest-boss-wenyan-2', 'leave', 'rest', 'boss', 'wenyan', 'joke',
    '启者{对象称呼}：神思困顿，{事由}，恳请休整一日。[[期间{补救动作}，]]不误要务。'),
  t('lv-rest-boss-wenyan-3', 'leave', 'rest', 'boss', 'wenyan', 'joke',
    '{对象称呼}容禀：积劳须纾，{事由}，伏乞宽假一日。[[预计{日期}精神复振，]]伏候准裁。'),
  t('lv-rest-boss-fafeng-1', 'leave', 'rest', 'boss', 'fafeng', 'joke',
    '{对象称呼}！！{事由}！！我的电量只剩百分之一了！！[[申请充电一天，{日期}满电复工！！]]'),
  t('lv-rest-boss-fafeng-2', 'leave', 'rest', 'boss', 'fafeng', 'joke',
    '报告{对象称呼}，{事由}，本机的散热系统已经撑不住了。[[请假一天降温，{补救动作}！]]'),
  t('lv-rest-boss-fafeng-3', 'leave', 'rest', 'boss', 'fafeng', 'joke',
    '{对象称呼}，{事由}，再不休息我就要原地进入省电模式了。[[请假一天回血，{日期}回来卷土重来！]]'),
]

export const DOCUMENT_TEMPLATES: readonly DocumentTemplate[] = [
  ...LATE_BOSS,
  ...FORGOT_REPLY_PARTNER,
  ...FORGOT_DAY_PARTNER,
  ...NO_SHOW_FRIEND,
  ...MISSED_WORK_BOSS,
  ...DELAYED_CLIENT,
  ...SICK_BOSS,
  ...PERSONAL_BOSS,
  ...FAMILY_BOSS,
  ...COMP_OFF_BOSS,
  ...REST_BOSS,
  ...JOKES,
]

// 启用矩阵：只登记实际完成审核的组合，lint 对每个单元要求恰好 3 条候选。
const USABLE_PAIRS: ReadonlyArray<readonly [DocumentType, string, string]> = [
  ['apology', 'late', 'boss'],
  ['apology', 'late', 'teacher'],
  ['apology', 'forgot-reply', 'partner'],
  ['apology', 'forgot-reply', 'friend'],
  ['apology', 'forgot-day', 'partner'],
  ['apology', 'no-show', 'friend'],
  ['apology', 'missed-work', 'boss'],
  ['apology', 'delayed', 'client'],
  ['leave', 'sick', 'boss'],
  ['leave', 'sick', 'teacher'],
  ['leave', 'personal', 'boss'],
  ['leave', 'family', 'boss'],
  ['leave', 'comp-off', 'boss'],
  ['leave', 'rest', 'boss'],
]
const JOKE_PAIRS: ReadonlyArray<readonly [DocumentType, string, string]> = [
  ['apology', 'late', 'boss'],
  ['apology', 'forgot-reply', 'friend'],
  ['apology', 'forgot-day', 'partner'],
  ['apology', 'no-show', 'friend'],
  ['apology', 'missed-work', 'boss'],
  ['apology', 'delayed', 'client'],
  ['leave', 'sick', 'boss'],
  ['leave', 'personal', 'boss'],
  ['leave', 'rest', 'boss'],
]
const USABLE_TONES = ['sincere', 'brief', 'gentle'] as const
const JOKE_TONES = ['wenyan', 'fafeng'] as const

export const ENABLED_DOCUMENT_CELLS: readonly DocumentCell[] = [
  ...USABLE_PAIRS.flatMap(([type, scene, audience]) =>
    USABLE_TONES.map((tone): DocumentCell => ({ type, scene, audience, tone })),
  ),
  ...JOKE_PAIRS.flatMap(([type, scene, audience]) =>
    JOKE_TONES.map((tone): DocumentCell => ({ type, scene, audience, tone })),
  ),
]

// 选择器只暴露启用矩阵里存在的选项，避免选到没有内容的组合。
export function enabledScenes(type: DocumentType): readonly string[] {
  return [...new Set(ENABLED_DOCUMENT_CELLS.filter((c) => c.type === type).map((c) => c.scene))]
}

export function enabledAudiences(type: DocumentType, scene: string): readonly string[] {
  return [
    ...new Set(
      ENABLED_DOCUMENT_CELLS.filter((c) => c.type === type && c.scene === scene).map((c) => c.audience),
    ),
  ]
}

export function enabledTones(type: DocumentType, scene: string, audience: string): readonly string[] {
  return ENABLED_DOCUMENT_CELLS.filter(
    (c) => c.type === type && c.scene === scene && c.audience === audience,
  ).map((c) => c.tone)
}

export function templatesFor(cell: DocumentCell): readonly DocumentTemplate[] {
  return DOCUMENT_TEMPLATES.filter(
    (t) => t.type === cell.type && t.scene === cell.scene && t.audience === cell.audience && t.tone === cell.tone,
  )
}
