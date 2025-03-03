<template>
  <div
    class="flex justify-center h-screen bg-circles"
    style="background-color: #31332d"
  >
    <div class="flex flex-col gap-4 w-full pb-8">
      <div class="flex w-full justify-center absolute h-full">
        <img
          :src="map_01"
          class="h-full"
          draggable="false"
          @dragstart.prevent
        />
      </div>
      <div class="flex w-full justify-center absolute h-full">
        <img
          :src="gridShadow"
          class="h-full"
          draggable="false"
          @dragstart.prevent
        />
      </div>
      <div class="flex flex-col pt-4 z-10 gap-2">
        <div class="flex justify-center gap-2 text-green-300">
          <button
            @click="fileSave('gems.json', getStorage())"
            class="bg-green-800 rounded-md w-24 pb-1 hover:bg-green-900 saturate-[0.2]"
          >
            save
          </button>
          <button
            @click="onFileLoad"
            class="bg-green-800 rounded-md w-24 pb-1 hover:bg-green-900 saturate-[0.2]"
          >
            load
          </button>
          <button
            @click="pause = !pause"
            class="bg-green-800 rounded-md w-24 pb-1 hover:bg-green-900 saturate-[0.2]"
          >
            {{ !pause ? "pause" : "continue" }}
          </button>
          <div
            class="bg-green-800 rounded-md w-[650px] pl-2 pb-1 cursor-default saturate-[0.2]"
            :class="{ 'opacity-0': pending }"
          >
            two: {{ two }} three: {{ three }} four: {{ four }} five:
            {{ five }} six: {{ six }} seven: {{ seven }} eight+:
            {{ eight }} shardCount: {{ shardCount }}
          </div>
          <div
            class="flex gap-2 w-42 items-center"
            :class="{ 'opacity-0': pending }"
          >
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="0.4"
              step="0.01"
              v-model="volume"
              class="cursor-pointer w-20"
              @input="debouncedLocalStorageSave"
            />
            <label
              for="volume-slider"
              class="w-20 font-medium text-gray-400 text-xs"
              >Volume: {{ Math.round(volume * 250) }}%</label
            >
          </div>
        </div>
        <div class="flex justify-center gap-2 text-green-300">
          <button
            v-for="(arc, name) in arcs"
            :key="`${name}-${arc}`"
            @click="onChangeArc(arc)"
            class="bg-green-800 rounded-md w-24 pb-1 hover:bg-green-900 saturate-[0.2]"
          >
            {{ name }}
          </button>
        </div>
      </div>
      <Game
        v-if="!pending"
        :pause="pause"
        :arc="arc"
        :volume="volume"
        @win="onWin"
        @shard-count="onShardCount"
      />
    </div>
  </div>
</template>
<script setup>
import fileSave from "~/utils/fileSave"
import fileLoad from "~/utils/fileLoad"
import debounce from "~/utils/debounce"
import timestamp from "~/utils/timestamp"
import map_01 from "~/assets/map_01.webp"
import gridShadow from "~/assets/grid_shadow.png"
import { ARC } from "~/components/constants"

const APP_LOCAL_STORAGE_KEY = "gems"
const DEBOUNCE_DELAY = 300

const volume = ref(0.2)
const pause = ref(false)
const pending = ref(true) // run game only after local storage is loaded

const arcs = ref({
  default: null,
  aim: ARC.AIM,
  crystal: ARC.CRYSTAL,
  boom: ARC.BOOM,
  miasma: ARC.MIASMA,
  gambler: ARC.GAMBLER,
})

function onChangeArc(arcToSet) {
  arc.value = arcToSet
  pending.value = true // restart game
  console.log(pending.value)
  nextTick(() => (pending.value = false))
  debouncedLocalStorageSave()
}

const experience = ref(0)
const arc = ref(null)
const two = ref(0)
const three = ref(0)
const four = ref(0)
const five = ref(0)
const six = ref(0)
const seven = ref(0)
const eight = ref(0)
const shardCount = ref(0)

const debouncedLocalStorageSave = debounce(() => {
  localStorageSave()
}, DEBOUNCE_DELAY)

onMounted(() => {
  pending.value = false
  localStorageLoad()
})

function onWin(state) {
  experience.value += state.experience
  two.value += state.two
  three.value += state.three
  four.value += state.four
  five.value += state.five
  six.value += state.six
  seven.value += state.seven
  eight.value += state.eight
  debouncedLocalStorageSave()
}
function onShardCount() {
  shardCount.value += 1
}
function injectStorage(storage) {
  experience.value = storage.experience
  arc.value = storage.arc
  volume.value = storage.volume || volume.value
  two.value = storage.two || two.value
  three.value = storage.three || three.value
  four.value = storage.four || four.value
  five.value = storage.five || five.value
  six.value = storage.six || six.value
  seven.value = storage.seven || seven.value
  eight.value = storage.eight || eight.value
  shardCount.value = storage.shardCount || shardCount.value
}
function getStorage() {
  return {
    experience: experience.value,
    arc: arc.value,
    volume: volume.value,
    two: two.value,
    three: three.value,
    four: four.value,
    five: five.value,
    six: six.value,
    seven: seven.value,
    eight: eight.value,
    shardCount: shardCount.value,
  }
}
function localStorageLoad() {
  const storageRaw = localStorage.getItem(APP_LOCAL_STORAGE_KEY)
  if (storageRaw) injectStorage(JSON.parse(storageRaw))
}
function localStorageSave() {
  localStorage.setItem(APP_LOCAL_STORAGE_KEY, JSON.stringify(getStorage()))
  console.log(`⏬ local storage updated [${timestamp()}]`)
}
async function onFileLoad() {
  await fileLoad(injectStorage)
  debouncedLocalStorageSave()
}
</script>
