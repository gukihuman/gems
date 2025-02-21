/** x and y are always pixel coordinates, grid uses flat indices */

<template>
  <div
    class="flex justify-center items-center h-screen bg-slate-500 bg-circles"
  >
    <div class="bg-slate-600 max-w-[500px] w-full rounded-lg p-1 shadow-xl">
      <div
        ref="gridRef"
        class="relative grid aspect-square bg-slate-600 overflow-hidden"
        :style="{
          'grid-template-columns': `repeat(${gridSize}, minmax(0, 1fr))`,
        }"
      >
        <div
          v-for="(_, i) in grid"
          :key="i"
          class="border-[3px] border-slate-600 rounded-md bg-slate-700"
        ></div>
        <div
          v-for="(gem, i) in gemsById"
          :key="i"
          class="absolute group"
          :ref="(el) => (gem.element = el)"
          :style="{
            left: gem.x + 'px',
            top: gem.y + 'px',
            width: cellSize + 'px',
            height: cellSize + 'px',
            padding: cellSize * 0.1 + 'px',
          }"
        >
          <div
            class="border-4 rounded-full size-full duration-200 ease-out"
            :class="[
              GEM_CLASSES[gem.color],
              {
                'group-hover:brightness-150 group-hover:scale-[1.2]':
                  !gem.animation,
              },
            ]"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import anime from "animejs"
import newId from "./utils/newId"
import { nextTick } from "vue"

const GRID_SIZE = 9
// const GEMS_COLORS = ["ORANGE", "LIME", "INDIGO", "PURPLE", "YELLOW"]
const GEMS_COLORS = ["ORANGE", "LIME", "INDIGO"]
const GEM_CLASSES = {
  ORANGE: "orange",
  LIME: "lime",
  INDIGO: "indigo",
  PURPLE: "purple",
  YELLOW: "yellow",
}
const DISTANCE_PER_SECOND = 150
const REMOVE_DELAY = 500

const gridRef = ref(null)

const gemsById = ref({})
const cellSize = ref(0)
const gridSize = ref(GRID_SIZE)
const grid = ref(
  Array.from(Array(gridSize.value ** 2), () => ({
    gemId: null,
    x: 0,
    y: 0,
  }))
)

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  requestAnimationFrame(gameLoop)
})

function gameLoop() {
  generateGems()
  checkMatches()
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
    const cell = grid.value[gem.gridIndex]
    gem.targetX = cell.x
    gem.targetY = cell.y
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
      const cell = grid.value[i]
      cell.gemId = id
      gemsById.value[id] = {
        gridIndex: i,
        color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
        x: cellSize.value * (i % gridSize.value),
        y: -(cellSize.value * (emptyCount - row)),
        targetX: cell.x,
        targetY: cell.y,
        animation: false,
        element: null,
      }
      animate(gemsById.value[id])
    }
  }
}
function animate(gem) {
  if (gem.animation) {
    anime.remove(gem)
    anime.remove(gem.element)
  }
  gem.animation = true
  let distance = Math.max(
    Math.abs(gem.targetX - gem.x),
    Math.abs(gem.targetY - gem.y)
  )
  const duration = 1000 * (distance / DISTANCE_PER_SECOND)
  nextTick(() => {
    anime({
      targets: gem,
      x: gem.targetX,
      y: gem.targetY,
      duration,
      delay: REMOVE_DELAY,
      easing: "easeInOutExpo",
      complete: () => (gem.animation = false),
    })
  })
}
function removeGem(gemId) {
  const gem = gemsById.value[gemId]
  grid.value[gem.gridIndex].gemId = null
  gem.animation = true
  nextTick(() => {
    anime({
      targets: gem.element,
      scale: [
        { value: 1.2, duration: REMOVE_DELAY * 0.3, easing: "easeOutQuad" },
        { value: 0, duration: REMOVE_DELAY * 0.7, easing: "easeInQuad" },
      ],
      opacity: [{ value: 0, duration: REMOVE_DELAY, easing: "easeInQuad" }],
      complete: () => delete gemsById.value[gemId],
    })
  })
}
function checkMatches() {
  const matchedGemIds = new Set()
  for (let row = 0; row < gridSize.value; row++) {
    const startIndex = row * gridSize.value
    checkLine(matchedGemIds, startIndex, 1)
  }
  for (let startIndex = 0; startIndex < gridSize.value; startIndex++) {
    checkLine(matchedGemIds, startIndex, gridSize.value)
  }
  matchedGemIds.forEach((gemId) => removeGem(gemId))
}
function checkLine(matchedGemIds, startIndex, step) {
  let singleColorLine = [] // gemIds
  let currentColor = null
  let matchCount = 1
  for (let i = 0; i < gridSize.value; i++) {
    const gemId = grid.value[startIndex + i * step].gemId
    const gem = gemsById.value[gemId]
    if (gem.animation) {
      resolveLine(matchedGemIds, singleColorLine, matchCount)
      singleColorLine = []
      currentColor = null
      matchCount = 1
      continue
    }
    if (gem.color === currentColor) {
      singleColorLine.push(gemId)
      matchCount++
    } else {
      resolveLine(matchedGemIds, singleColorLine, matchCount)
      singleColorLine = [gemId]
      currentColor = gem.color
      matchCount = 1
    }
  }
  resolveLine(matchedGemIds, singleColorLine, matchCount)
}
function resolveLine(matchedGemIds, singleColorLine, matchCount) {
  if (matchCount < 3) return
  singleColorLine.forEach((gemId) => matchedGemIds.add(gemId))
}
</script>
