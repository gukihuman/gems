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
import anime from "animejs"
import newId from "./utils/newId"

const DISTANCE_PER_SECOND = 250
const GRID_SIZE = 8
const GEMS_COLORS = ["RED", "GREEN", "BLUE", "PURPLE", "YELLOW"]
const GEM_CLASSES = {
  RED: "bg-orange-600 border-orange-700",
  GREEN: "bg-lime-600 border-lime-700",
  BLUE: "bg-indigo-500 border-indigo-600",
  PURPLE: "bg-purple-600 border-purple-900",
  YELLOW: "bg-yellow-500 border-yellow-600",
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
const cellSize = ref(0)
const gridSize = ref(GRID_SIZE)
const grid = ref(Array.from(Array(gridSize.value ** 2), () => new Cell()))

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  requestAnimationFrame(gameLoop)
  setTimeout(() => {
    delete gemsById.value[grid.value[39].gemId]
    delete gemsById.value[grid.value[47].gemId]
    delete gemsById.value[grid.value[55].gemId]
    grid.value[39].gemId = null
    grid.value[47].gemId = null
    grid.value[55].gemId = null
  }, 2000)
})

function gameLoop() {
  generateGems()
  requestAnimationFrame(gameLoop)
}
function setGridCoordinates() {
  const { width } = gridRef.value.getBoundingClientRect()
  cellSize.value = width / gridSize.value
  grid.value.forEach((cell, i) => {
    cell.x = cellSize.value * (i % gridSize.value)
    cell.y = cellSize.value * Math.floor(i / gridSize.value)
  })
  Object.values(gemsById.value).forEach((gem) => {
    gem.targetX = grid.value[gem.gridIndex].x
    gem.targetY = grid.value[gem.gridIndex].y
  })
}
function generateGems() {
  for (let column = gridSize.value - 1; column >= 0; column--) {
    let emptyCells = false
    for (let row = 0; row < gridSize.value; row++) {
      const i = row * gridSize.value + column
      if (!grid.value[i].gemId) emptyCells = true
    }
    if (!emptyCells) continue

    let columnGems = []
    for (let row = gridSize.value - 1; row >= 0; row--) {
      const i = row * gridSize.value + column
      if (grid.value[i].gemId) {
        columnGems.push(grid.value[i].gemId)
        grid.value[i].gemId = null
      }
    }
    columnGems.forEach((gemId, row) => {
      const reverseRow = gridSize.value - 1 - row
      const i = reverseRow * gridSize.value + column
      grid.value[i].gemId = gemId
      const gem = gemsById.value[gemId]
      gem.targetX = grid.value[i].x
      gem.targetY = grid.value[i].y
      gem.gridIndex = i
      animate(gem)
    })

    const emptyCount = gridSize.value - columnGems.length

    for (let row = 0; row < emptyCount; row++) {
      let i = row * gridSize.value + column
      const id = newId()
      grid.value[i].gemId = id
      gemsById.value[id] = {
        gridIndex: i,
        color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
        x: cellSize.value * (i % gridSize.value),
        y: -(cellSize.value * (emptyCount - row)),
        targetX: grid.value[i].x,
        targetY: grid.value[i].y,
        animation: false,
      }
      animate(gemsById.value[id])
    }
  }
}
function animate(gem) {
  if (gem.animation) anime.remove(gem)
  gem.animation = true
  let distance = Math.max(
    Math.abs(gem.targetX - gem.x),
    Math.abs(gem.targetY - gem.y)
  )
  anime({
    targets: gem,
    x: gem.targetX,
    y: gem.targetY,
    duration: 1000 * (distance / DISTANCE_PER_SECOND),
    easing: "easeInOutQuad",
    complete: () => (gem.animation = false),
  })
}
</script>
