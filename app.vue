<template>
  <div class="flex justify-center items-center h-screen bg-slate-400">
    <div class="bg-slate-200 max-w-[500px] w-full rounded-lg shadow-md p-1">
      <div
        ref="gridRef"
        class="relative grid aspect-square grid-cols-9 bg-slate-200 overflow-hidden"
      >
        <div
          v-for="(_, i) in grid"
          :key="i"
          class="border-2 border-slate-200 rounded-md bg-slate-300"
        ></div>
        <div
          v-for="(gem, i) in gemsById"
          :key="i"
          class="absolute"
          :style="{
            left: gem.x + 'px',
            top: gem.y + 'px',
            width: cellSize + 'px',
            height: cellSize + 'px',
            padding: cellSize * 0.1 + 'px',
          }"
        >
          <div
            class="border-4 rounded-full size-full"
            :class="GEM_CLASSES[gem.color]"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue"
import newId from "./utils/newId"
const GEMS_COLORS = ["RED", "GREEN", "BLUE", "PURPLE"]
const GEM_CLASSES = {
  RED: "bg-red-600 border-red-800",
  GREEN: "bg-green-600 border-green-800",
  BLUE: "bg-blue-600 border-blue-800",
  PURPLE: "bg-purple-600 border-purple-800",
}
const GEM_SPEED = 10
class Cell {
  constructor(gemsById) {
    this.gemsById = gemsById
    this.gemId = null
    this.x = 0
    this.y = 0
  }
  get color() {
    return this.gemsById[this.gemId]?.color || null
  }
}
const gridRef = ref(null)

const gemsById = ref({})
const grid = ref(Array.from(Array(81), () => new Cell(gemsById.value)))
const cellSize = ref(0)

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  requestAnimationFrame(gameLoop)
})
function setGridCoordinates() {
  const { width } = gridRef.value.getBoundingClientRect()
  cellSize.value = width / 9
  grid.value.forEach((cell, index) => {
    cell.x = cellSize.value * (index % 9)
    cell.y = cellSize.value * Math.floor(index / 9)
  })
  Object.values(gemsById.value).forEach((gem) => {
    gem.targetX = grid.value[gem.gridIndex].x
    gem.targetY = grid.value[gem.gridIndex].y
  })
}
function gameLoop() {
  generateGems()
  updateGemPositions()
  requestAnimationFrame(gameLoop)
}
function generateGems() {
  grid.value.forEach((cell, index) => {
    if (cell.gemId) return
    const id = newId()
    gemsById.value[id] = {
      gridIndex: index,
      color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
      x: ref((index % 9) * cellSize.value),
      y: ref(-(cellSize.value * (9 - Math.floor(index / 9)))),
      targetX: cell.x,
      targetY: cell.y,
    }
    cell.gemId = id
  })
}
function updateGemPositions() {
  Object.values(gemsById.value).forEach((gem) => {
    if (gem.x < gem.targetX) {
      gem.x = Math.min(gem.x + GEM_SPEED, gem.targetX)
    } else if (gem.x > gem.targetX) {
      gem.x = Math.max(gem.x - GEM_SPEED, gem.targetX)
    }
    if (gem.y < gem.targetY) {
      gem.y = Math.min(gem.y + GEM_SPEED, gem.targetY)
    } else if (gem.y > gem.targetY) {
      gem.y = Math.max(gem.y - GEM_SPEED, gem.targetY)
    }
  })
}
</script>
