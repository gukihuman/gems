<template>
  <div
    class="flex justify-center items-center h-screen bg-slate-500 bg-circles"
  >
    <div class="flex flex-col gap-12 w-full">
      <div class="flex justify-center gap-2 text-slate-300">
        <button
          @click="fileSave('gems.json', getStorage())"
          class="bg-slate-600 rounded-md w-24 pb-1 hover:bg-slate-700"
        >
          save
        </button>
        <button
          @click="onFileLoad"
          class="bg-slate-600 rounded-md w-24 pb-1 hover:bg-slate-700"
        >
          load
        </button>
        <button
          @click="pause = !pause"
          class="bg-slate-600 rounded-md w-24 pb-1 hover:bg-slate-700"
        >
          {{ !pause ? "pause" : "continue" }}
        </button>
      </div>
      <Game :pause="pause" @state-updated="handleStateUpdate" />
    </div>
  </div>
</template>
<script setup>
import fileSave from "./utils/fileSave"
import fileLoad from "./utils/fileLoad"
import debounce from "./utils/debounce"
import timestamp from "./utils/timestamp"

const APP_LOCAL_STORAGE_KEY = "gems"
const DEBOUNCE_DELAY = 300

const pause = ref(false)

const experience = ref(0)

const debouncedLocalStorageSave = debounce(() => {
  localStorageSave()
}, DEBOUNCE_DELAY)

onMounted(localStorageLoad)

function handleStateUpdate(state) {
  experience.value += state.experience
  debouncedLocalStorageSave()
}
function injectStorage(storage) {
  experience.value = storage.experience
}
function getStorage() {
  return {
    experience: experience.value,
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
