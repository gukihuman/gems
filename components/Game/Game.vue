<template>
  <div class="flex gap-4 w-full justify-center">
    <GameDamageLog :damageLogs="damageLogs" :arc="arc" />
    <GameGrid
      :pause="pause"
      :arc="arc"
      @match="onMatch"
      @shard-count="onShardCount"
    />
    <div class="w-80"></div>
  </div>
</template>
<script setup>
import { GEMS } from "~/components/constants"
const DAMAGE = [2, 3]
// handle any possible match count from 0 to 10 (max)
const DAMAGE_MULTIPLIER = [0, 1, 1, 1, 5, 50, 500, 2_500, 5_000, 10_000, 20_000]

const props = defineProps(["pause", "arc"])
const emit = defineEmits(["win", "shard-count"])

const damageLogs = ref([])
const matchQueue = []
let isProcessingQueue = false

function onMatch(color, count) {
  matchQueue.push({ color, count })
  if (!isProcessingQueue) processMatchQueue()
}
function onShardCount() {
  emit("shard-count")
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
    multiplier: DAMAGE_MULTIPLIER[nextMatch.count],
    ...getDamage(nextMatch.count),
  })
  damageLogs.value.splice(10)
  setTimeout(() => processMatchQueue(), 300)
  // 📜 change to only after win, currently triggers local storage every match
  emit("win", {
    experience: 0,
    two: nextMatch.count === 2 ? 1 : 0,
    three: nextMatch.count === 3 ? 1 : 0,
    four: nextMatch.count === 4 ? 1 : 0,
    five: nextMatch.count === 5 ? 1 : 0,
    six: nextMatch.count === 6 ? 1 : 0,
    seven: nextMatch.count === 7 ? 1 : 0,
    eight: nextMatch.count >= 8 ? 1 : 0,
    shardCount: nextMatch.color === GEMS.BLUE ? nextMatch.count : 0,
  })
}
function getDamage(count) {
  const randomAddition = Math.random() * (DAMAGE[1] - DAMAGE[0])
  const baseDamage = Math.round(DAMAGE[0] + randomAddition)
  const fullDamage = Math.round(baseDamage * DAMAGE_MULTIPLIER[count])
  return { baseDamage, fullDamage }
}
</script>
