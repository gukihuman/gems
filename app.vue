<template>
  <div class="flex justify-center pt-6 h-screen bg-gray-500 bg-circles">
    <div class="flex flex-col gap-8 w-full pb-8">
      <div class="flex justify-center gap-2 text-gray-300">
        <button
          @click="fileSave('gems.json', getStorage())"
          class="bg-gray-600 rounded-md w-24 pb-1 hover:bg-gray-700"
        >
          save
        </button>
        <button
          @click="onFileLoad"
          class="bg-gray-600 rounded-md w-24 pb-1 hover:bg-gray-700"
        >
          load
        </button>
        <button
          @click="pause = !pause"
          class="bg-gray-600 rounded-md w-24 pb-1 hover:bg-gray-700"
        >
          {{ !pause ? "pause" : "continue" }}
        </button>
        <div
          class="bg-gray-600 rounded-md w-[600px] px-2 pb-1 hover:bg-gray-700"
        >
          two: {{ two }} three: {{ three }} four: {{ four }} five:
          {{ five }} six: {{ six }} seven: {{ seven }} eight+:
          {{ eight }} shardCount: {{ shardCount }}
        </div>
      </div>
      <Game
        v-if="!pending"
        :pause="pause"
        :arc="arc"
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

const APP_LOCAL_STORAGE_KEY = "gems"
const DEBOUNCE_DELAY = 300

const pause = ref(false)
const pending = ref(true) // run game only after local storage is loaded

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
  // arc.value = storage.arc
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
