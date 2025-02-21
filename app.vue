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
  setTimeout(() => {
    delete gemsById.value[grid.value[39].gemId]
    delete gemsById.value[grid.value[48].gemId]
    delete gemsById.value[grid.value[57].gemId]
    grid.value[39].gemId = null
    grid.value[48].gemId = null
    grid.value[57].gemId = null
  }, 2000)
})

function gameLoop() {
  generateGems()
  updateGemPositions()
  requestAnimationFrame(gameLoop)
}
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
function generateGems() {
  for (let y = 0; y < gridSize.value; y++) {
    let emptyCount = 0
    for (let i = grid.value.length - 1 - y; i >= 0; i -= gridSize.value) {
      const cell = grid.value[i]
      if (cell.gemId) continue

      let isUpGem = false
      let emptyCountTemp = 0
      for (let iUp = i; iUp >= 0; iUp -= 9) {
        const upCell = grid.value[iUp]
        if (upCell.gemId) {
          isUpGem = true
          const gemId = upCell.gemId
          cell.gemId = gemId
          upCell.gemId = null
          const upGem = gemsById.value[gemId]
          upGem.targetX = cell.x
          upGem.targetY = cell.y
          break
        } else {
          emptyCountTemp++
          emptyCount = Math.max(emptyCount, emptyCountTemp)
        }
      }
      if (!isUpGem) {
        const id = newId()
        gemsById.value[id] = {
          gridIndex: i,
          color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
          x: getXByIndex(i),
          y: getBaseYByIndex(i, emptyCount),
          targetX: cell.x,
          targetY: cell.y,
        }
        cell.gemId = id
      }
    }
  }
}
function updateGemPositions() {
  Object.values(gemsById.value).forEach((gem) => {
    gem.x = move(gem.x, gem.targetX)
    gem.y = move(gem.y, gem.targetY)
  })
}
function getXByIndex(i) {
  return cellSize.value * (i % gridSize.value)
}
function getYByIndex(i) {
  return cellSize.value * Math.floor(i / gridSize.value)
}
function getBaseYByIndex(i, emptyCount) {
  return -(cellSize.value * (emptyCount - Math.floor(i / gridSize.value)))
}
</script>
