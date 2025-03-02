<template>
  <div class="flex gap-4 w-full justify-center">
    <!-- <GameDamageLog :damageLogs="damageLogs" :arc="arc" /> -->
    <GameGrid
      :pause="pause"
      :arc="arc"
      @match="onMatch"
      @shard-count="onShardCount"
    />
    <!-- <div class="w-80"></div> -->
  </div>
</template>
<script setup>
import { ARC, GEMS, MIN_MATCH } from "~/components/constants"
import default_3 from "~/assets/sound/default_3.mp3"
import default_4 from "~/assets/sound/default_4.mp3"
import default_5 from "~/assets/sound/default_5.mp3"
import aim_4 from "~/assets/sound/aim_4.mp3"
import aim_5 from "~/assets/sound/aim_5.mp3"
import aim_6 from "~/assets/sound/aim_6.mp3"
import aim_7 from "~/assets/sound/aim_7.mp3"
import crystal from "~/assets/sound/crystal.mp3"
import miasma_3 from "~/assets/sound/miasma_3.mp3"
import miasma_4 from "~/assets/sound/miasma_4.mp3"
import miasma_5 from "~/assets/sound/miasma_5.mp3"

const DAMAGE = [2, 3]
// handle any possible match count from 0 to 10 (max)
const DAMAGE_MULTIPLIER = [0, 1, 1, 1, 5, 50, 500, 2_500, 5_000, 10_000, 20_000]

const props = defineProps(["pause", "arc"])
const emit = defineEmits(["win", "shard-count"])

const SOUND_VOLUME = 0.3
const EMIT_SOUND_DELAY = 80
const EMIT_MATCH_DELAY = 300
const SOUND_MAP = {
  YELLOW:
    props.arc === ARC.AIM
      ? [aim_4, aim_5, aim_6, aim_7]
      : [default_3, default_4, default_5],
  BLUE:
    props.arc === ARC.CRYSTAL ? [crystal] : [default_3, default_4, default_5],
  GREEN:
    props.arc === ARC.MIASMA
      ? [miasma_3, miasma_4, miasma_5]
      : [default_3, default_4, default_5],
  RED:
    props.arc === ARC.BOOM
      ? [miasma_3, miasma_4, miasma_5]
      : [default_3, default_4, default_5],
  PURPLE:
    props.arc === ARC.GAMBLER
      ? [miasma_3, miasma_3, miasma_3]
      : [default_3, default_4, default_5],
}

const damageLogs = ref([])
const matchQueue = []
const soundQueue = []
let isProcessingQueue = false
let isProcessingSoundQueue = false

function onMatch(color, count) {
  matchQueue.push({ color, count })
  if (!isProcessingQueue) processMatchQueue()

  let minMatch = MIN_MATCH
  if (props.arc === ARC.AIM && color === GEMS.YELLOW) minMatch += 1
  if (props.arc === ARC.CRYSTAL && color === GEMS.BLUE) minMatch -= 1
  const sound = SOUND_MAP[Object.keys(SOUND_MAP)[color]]
  const soundIndex = Math.min(Math.max(count - minMatch, 0), sound.length - 1)
  soundQueue.push(new Audio(sound[soundIndex]))
  if (!isProcessingSoundQueue) processSoundQueue()
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
  setTimeout(() => processMatchQueue(), EMIT_MATCH_DELAY)
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
function processSoundQueue() {
  if (soundQueue.length === 0) {
    isProcessingSoundQueue = false
    return
  }
  isProcessingSoundQueue = true
  const sound = soundQueue.shift()
  sound.volume = SOUND_VOLUME
  sound.play().catch((error) => {
    console.error("Error playing sound:", error)
  })
  setTimeout(() => processSoundQueue(), EMIT_SOUND_DELAY)
}
function getDamage(count) {
  const randomAddition = Math.random() * (DAMAGE[1] - DAMAGE[0])
  const baseDamage = Math.round(DAMAGE[0] + randomAddition)
  const fullDamage = Math.round(baseDamage * DAMAGE_MULTIPLIER[count])
  return { baseDamage, fullDamage }
}
</script>
