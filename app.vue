<template>
  <div
    class="flex justify-center items-center h-screen bg-slate-500 bg-circles"
  >
    <div class="flex gap-4 w-full justify-center">
      <DamageLog :damageLogs="damageLogs" />
      <Grid :size="GRID_SIZE" :min-match="MIN_MATCH" @match="handleMatch" />
      <div class="w-80"></div>
    </div>
  </div>
</template>
<script setup>
const DAMAGE = [2, 3]
const GRID_SIZE = 8
const MIN_MATCH = 3
const MAX_MULTIPLIER = 100
const MULTIPLIER = [1, 5, 20, 50, 70, MAX_MULTIPLIER] // 3, 4, 5, 6, 7, 8
const damageLogs = ref([])
const matchQueue = []
let isProcessingQueue = false
function handleMatch(color, matchCount) {
  matchQueue.push({ color, count: matchCount })
  if (!isProcessingQueue) processMatchQueue()
}
function processMatchQueue() {
  if (matchQueue.length === 0) {
    isProcessingQueue = false
    return
  }
  isProcessingQueue = true
  const nextMatch = matchQueue.shift()
  damageLogs.value.unshift({
    id: Math.random(),
    color: nextMatch.color,
    count: nextMatch.count,
    multiplier: getMultiplier(nextMatch.count),
    ...getDamage(nextMatch.count),
  })
  damageLogs.value.splice(10)
  setTimeout(() => processMatchQueue(), 300)
}
function getMultiplier(count) {
  return count <= 8 ? MULTIPLIER[count - 3] : MAX_MULTIPLIER
}
function getDamage(count) {
  const randomAddition = Math.random() * (DAMAGE[1] - DAMAGE[0])
  const baseDamage = Math.round(DAMAGE[0] + randomAddition)
  const fullDamage = Math.round(baseDamage * getMultiplier(count))
  return { baseDamage, fullDamage }
}
</script>
