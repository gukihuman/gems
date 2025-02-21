<template>
  <div class="flex justify-center items-center h-screen bg-slate-400">
    <div class="bg-slate-200 max-w-[500px] w-full rounded-lg shadow-md p-1">
      <div
        ref="gridRef"
        class="relative grid aspect-square bg-slate-200 overflow-hidden"
        :style="{
          'grid-template-columns': `repeat(${gridSize}, minmax(0, 1fr))`,
        }"
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
import newId from "./utils/newId"
import move from "./utils/move"

const GRID_SIZE = 9
const GEMS_COLORS = ["RED", "GREEN", "BLUE", "PURPLE"]
const GEM_CLASSES = {
  RED: "bg-red-600 border-red-800",
  GREEN: "bg-green-600 border-green-800",
  BLUE: "bg-blue-600 border-blue-800",
  PURPLE: "bg-purple-600 border-purple-800",
}
const GEM_SPEED = 10
class Cell {
  constructor() {
    this.gemId = null
    this.x = 0
    this.y = 0
  }
  get color() {
    return gemsById.value[this.gemId]?.color || null
  }
}
const gridRef = ref(null)

const gemsById = ref({})
const grid = ref(Array.from(Array(81), () => new Cell()))
const cellSize = ref(0)
const gridSize = ref(GRID_SIZE)

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  requestAnimationFrame(gameLoop)
})
function setGridCoordinates() {
  const { width } = gridRef.value.getBoundingClientRect()
  cellSize.value = width / gridSize.value
  grid.value.forEach((cell, i) => {
    cell.x = getXByIndex(i)
    cell.y = getYByIndex(i)
  })
  Object.values(gemsById.value).forEach((gem) => {
    gem.targetX = grid.value[gem.gridIndex].x
    gem.targetY = grid.value[gem.gridIndex].y
  })
}
function getXByIndex(i) {
  return cellSize.value * (i % gridSize.value)
}
function getYByIndex(i) {
  return cellSize.value * Math.floor(i / gridSize.value)
}
function getBaseYByIndex(i) {
  return -(cellSize.value * (gridSize.value - Math.floor(i / gridSize.value)))
}
function gameLoop() {
  generateGems()
  updateGemPositions()
  requestAnimationFrame(gameLoop)
}
function generateGems() {
  grid.value.forEach((cell, i) => {
    if (cell.gemId) return
    const id = newId()
    gemsById.value[id] = {
      gridIndex: i,
      color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
      x: getXByIndex(i),
      y: getBaseYByIndex(i),
      targetX: cell.x,
      targetY: cell.y,
    }
    cell.gemId = id
  })
}
function updateGemPositions() {
  Object.values(gemsById.value).forEach((gem) => {
    gem.x = move(gem.x, gem.targetX, GEM_SPEED)
    gem.y = move(gem.y, gem.targetY, GEM_SPEED)
  })
}
</script>
