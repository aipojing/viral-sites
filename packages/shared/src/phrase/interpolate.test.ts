import { describe, expect, it } from 'vitest'
import { listTemplateVariables, renderOptionalTemplate } from './interpolate'

describe('renderOptionalTemplate', () => {
  it('removes an optional block when one of its variables is absent', () => {
    expect(
      renderOptionalTemplate(
        '{对象称呼}，我因{事由}需要请假。[[预计{日期}返回，并会{补救动作}。]]',
        { 对象称呼: '老师', 事由: '个人事务' },
      ),
    ).toBe('老师，我因个人事务需要请假。')
  })

  it('保留可选块当其中变量全部提供', () => {
    expect(
      renderOptionalTemplate(
        '{对象称呼}，我因{事由}需要请假。[[预计{日期}返回，并会{补救动作}。]]',
        { 对象称呼: '老师', 事由: '身体不适', 日期: '周三', 补救动作: '补上进度' },
      ),
    ).toBe('老师，我因身体不适需要请假。预计周三返回，并会补上进度。')
  })

  it('同一变量多处替换且支持 Unicode 值', () => {
    expect(
      renderOptionalTemplate('{事由}让我很抱歉，再次为{事由}道歉。', { 事由: '放鸽子 🕊️' }),
    ).toBe('放鸽子 🕊️让我很抱歉，再次为放鸽子 🕊️道歉。')
  })

  it('HTML 字符保持纯文本，不做转义或解析', () => {
    expect(
      renderOptionalTemplate('对不起，{事由}。', { 事由: '<script>及"引号"' }),
    ).toBe('对不起，<script>及"引号"。')
  })

  it('必选变量缺失时抛出带变量名的错误', () => {
    expect(() => renderOptionalTemplate('我因{事由}请假。', {})).toThrowError(/事由/)
  })

  it('拒绝嵌套可选块', () => {
    expect(() =>
      renderOptionalTemplate('[[外层[[内层{事由}]]]]', { 事由: 'x' }),
    ).toThrow()
  })

  it('可选块移除后清理残余空格与重复标点', () => {
    expect(
      renderOptionalTemplate('已经记下{事由}了。 [[到时我会{补救动作}。]] 谢谢理解。', {
        事由: '这件事',
      }),
    ).toBe('已经记下这件事了。谢谢理解。')
    expect(
      renderOptionalTemplate('先说{事由}，[[再约{日期}，]]回头聊。', { 事由: '正事' }),
    ).toBe('先说正事，回头聊。')
  })

  it('变量值为空白串时视为缺失', () => {
    expect(
      renderOptionalTemplate('我因{事由}请假。[[预计{日期}返回。]]', { 事由: '家事', 日期: '  ' }),
    ).toBe('我因家事请假。')
  })
})

describe('listTemplateVariables', () => {
  it('按出现顺序去重列出变量，含可选块内变量', () => {
    expect(
      listTemplateVariables('{对象称呼}，{事由}。[[预计{日期}返回。]]{事由}'),
    ).toEqual(['对象称呼', '事由', '日期'])
  })

  it('无变量时返回空数组', () => {
    expect(listTemplateVariables('没有变量')).toEqual([])
  })
})
