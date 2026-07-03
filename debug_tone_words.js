// Quick test to debug applyToneWordRules
const { applyToneWordRules } = require('./lib/reply-controller/rules')

const testCases = [
  '嗯……嗯……嗯……',
  '哈哈哈哈',
  '…………',
  '哦哦哦哦',
]

for (const test of testCases) {
  const result = applyToneWordRules(test)
  console.log(`Input: ${test}`)
  console.log(`Output: ${result}`)
  console.log('---')
}
