<template>
  <div class="flex justify-center items-center min-h-screen bg-slate-400">
    <div
      ref="gridRef"
      class="grid grid-cols-9 bg-slate-200 rounded-lg shadow-md border-2"
    >
      <div
        v-for="(gemType, i) in grid"
        :key="i"
        class="size-16 border-2 border-slate-200 rounded-md bg-slate-300"
        :class="GEM_CLASSES[gemType]"
      ></div>
    </div>
  </div>
</template>

<script setup>
import newId from "./utils/newId"
const GEMS_COLORS = ["RED", "GREEN", "BLUE", "PURPLE"]
const GEM_CLASSES = {
  RED: "bg-red-600 border-red-800",
  GREEN: "bg-green-600 border-green-800",
  BLUE: "bg-blue-600 border-blue-800",
  PURPLE: "bg-purple-600 border-purple-800",
}
class Cell {
  constructor(gemsById) {
    this.x = 0
    this.y = 0
    this.gemsById = gemsById
    this.gemId = null
  }
  get color() {
    return this.gemsById[this.gemId]?.color || null
  }
}
const gridRef = ref(null)

const gemsById = ref({})
const grid = ref(Array.from(Array(81), () => new Cell(gemsById.value)))

onMounted(() => {
  setGridCoordinates()
  requestAnimationFrame(gameLoop)
})
function setGridCoordinates() {
  const { width } = gridRef.value.getBoundingClientRect()
  const cellWidth = width / 9
  grid.value.forEach((cell, index) => {
    cell.x = cellWidth * (index % 9) + cellWidth / 2
    cell.y = cellWidth * Math.floor(index / 9) + cellWidth / 2
  })
}
function gameLoop() {
  grid.value.forEach((cell) => {
    if (!cell.gemId) {
      const id = newId()
      gemsById.value[id] = newGem()
      cell.gemId = id
    }
  })
  requestAnimationFrame(gameLoop)
}
function newGem() {
  return {
    x: 0,
    y: 0,
    color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
  }
}
</script>
