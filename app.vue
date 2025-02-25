/** x and y are always pixel coordinates, grid uses flat indices and row / col
as coordinates */

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
          v-for="i in gridSize ** 2"
          :key="i"
          class="border-[3px] border-slate-600 rounded-md bg-slate-700"
          draggable="false"
          @dragstart.prevent
        ></div>
        <div
          v-for="(gem, id) in gemsById"
          :key="id"
          :data-gem-id="id"
          class="absolute group"
          :ref="(element) => (gem.element = element)"
          @mousedown="onMouseDown(id)"
          draggable="false"
          @dragstart.prevent
          :style="{
            left: gem.x - cellSize / 2 + 'px',
            top: gem.y - cellSize / 2 + 'px',
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
                  !activeGemId && gem.interactive,
                'scale-[0.85] brightness-150': id === activeGemId,
                'scale-[0.95] saturate-[0.4]': !gemsById[id].interactive,
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

const GRID_SIZE = 8
const MATCH = 3
const GEMS_COLORS = ["ORANGE", "LIME", "INDIGO", "PURPLE", "YELLOW"]
const GEM_CLASSES = {
  ORANGE: "orange",
  LIME: "lime",
  INDIGO: "indigo",
  PURPLE: "purple",
  YELLOW: "yellow",
}
const BASE_FALL_DALAY = 400
const DISTANCE_PER_SECOND = 400
const REMOVE_DELAY = 500
const CLICK_DELAY = 300
const MAX_DRAG_DISTANCE = 0.7 // cell size ratio

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
const activeGemId = ref(null)
const adjacentGemId = ref(null)
const mouse = { x: 0, y: 0 }
let activationTime = null
let gridRect = null

const maxDragDistance = computed(() => cellSize.value * MAX_DRAG_DISTANCE)
const gridEdge = computed(() => gridSize.value - 1)

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  addEventListener("mousemove", onMouseMove)
  addEventListener("mouseup", onMouseUp)
  addEventListener("keydown", (event) => {
    if (event.key === "o") {
      const closestGem = findClosestGem(mouse.x, mouse.y)
      if (closestGem) onMouseDown(closestGem.id)
    }
  })
  requestAnimationFrame(gameLoop)
})

function gameLoop() {
  cascadeGems()
  checkMatches()
  requestAnimationFrame(gameLoop)
}
function setGridCoordinates() {
  gridRect = gridRef.value.getBoundingClientRect()
  cellSize.value = gridRect.width / gridSize.value
  grid.value.forEach((cell, i) => {
    cell.x = cellSize.value * (i % gridSize.value) + cellSize.value / 2
    cell.y =
      cellSize.value * Math.floor(i / gridSize.value) + cellSize.value / 2
  })
}
function cascadeGems() {
  for (let col = gridEdge.value; col >= 0; col--) {
    let missingGems = 0
    let allAvailable = true
    for (let row = 0; row < gridSize.value; row++) {
      const gridIndex = row * gridSize.value + col
      const gem = gemsById.value[grid.value[gridIndex].gemId]
      if (!gem) missingGems++
      else if (!gem.interactive || gem.swapping) allAvailable = false
    }
    if (!missingGems || !allAvailable) continue
    cascadeUnstableGems(col)
    cascadeStableGems(col, missingGems)
  }
}
function cascadeUnstableGems(col) {
  let unstableColumnGems = []
  let stableGems = 0 // bottom of line
  let stableSoFar = true
  for (let row = gridEdge.value; row >= 0; row--) {
    const gridIndex = row * gridSize.value + col
    const cell = grid.value[gridIndex]
    if (stableSoFar && cell.gemId) {
      stableGems++
      continue
    }
    if (!cell.gemId) {
      stableSoFar = false
    } else {
      if (cell.gemId === activeGemId.value) homeGem(cell.gemId)
      unstableColumnGems.push(cell.gemId)
      cell.gemId = null
    }
  }
  unstableColumnGems.forEach((gemId, i) => {
    const row = gridEdge.value - i - stableGems
    const gridIndex = row * gridSize.value + col
    grid.value[gridIndex].gemId = gemId
    const gem = gemsById.value[gemId]
    gem.gridIndex = gridIndex
    animateCascade(gem)
  })
}
function cascadeStableGems(col, missingGems) {
  for (let row = 0; row < missingGems; row++) {
    const gridIndex = row * gridSize.value + col
    const id = newId()
    grid.value[gridIndex].gemId = id
    const { cellX } = getCellCoordinates(gridIndex)
    gemsById.value[id] = {
      gridIndex: gridIndex,
      color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
      x: cellX,
      y: -(cellSize.value * (missingGems - row)) + cellSize.value / 2,
      interactive: true,
      element: null,
    }
    animateCascade(gemsById.value[id])
  }
}
function animateCascade(gem) {
  gem.interactive = false
  const { cellX, cellY } = getCellCoordinates(gem.gridIndex)
  let distance = Math.max(Math.abs(cellX - gem.x), Math.abs(cellY - gem.y))
  const duration = BASE_FALL_DALAY + 1000 * (distance / DISTANCE_PER_SECOND)
  anime({
    targets: gem,
    x: cellX,
    y: cellY,
    duration,
    delay: REMOVE_DELAY,
    easing: "easeInOutExpo",
    complete: () => (gem.interactive = true),
  })
}
function removeGem(gemId) {
  if (gemId === activeGemId.value) homeGem(gemId)
  const gem = gemsById.value[gemId]
  grid.value[gem.gridIndex].gemId = null
  gem.interactive = false
  gem.element.style.filter = "brightness(1.5)"
  anime({
    targets: gem.element,
    scale: [
      { value: 1.2, duration: REMOVE_DELAY * 0.3, easing: "easeOutQuad" },
      { value: 0, duration: REMOVE_DELAY * 0.7, easing: "easeInQuad" },
    ],
    opacity: [{ value: 0, duration: REMOVE_DELAY, easing: "easeInQuad" }],
    complete: () => delete gemsById.value[gemId],
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
    if (!gem) return
    if (!gem.interactive) {
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
  if (matchCount < MATCH) return
  singleColorLine.forEach((gemId) => matchedGemIds.add(gemId))
}
function handleActiveGem(gemId) {
  const activeGem = gemsById.value[gemId]
  updateActiveGemCoordinates(activeGem)
  const adjacentGemId = getAdjacentGemId(activeGem)
  if (!adjacentGemId) return
  const adjacentGem = gemsById.value[adjacentGemId]
  if (!adjacentGem.interactive) return
  if (
    checkPossibleSwap(adjacentGem.gridIndex, activeGem.color, gemId) ||
    checkPossibleSwap(activeGem.gridIndex, adjacentGem.color, adjacentGemId)
  ) {
    swapGems(gemId, adjacentGemId)
  }
}
function updateActiveGemCoordinates(activeGem) {
  const { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance } =
    getMouseGemDistance(activeGem)
  if (mouseGemDistance < maxDragDistance.value) {
    activeGem.x = mouse.x
    activeGem.y = mouse.y
    return
  }
  const angle = Math.atan2(mouseGemDistanceY, mouseGemDistanceX)
  const { cellX, cellY } = getCellCoordinates(activeGem.gridIndex)
  activeGem.x = cellX + maxDragDistance.value * Math.cos(angle)
  activeGem.y = cellY + maxDragDistance.value * Math.sin(angle)
}
function getAdjacentGemId(gem) {
  const { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance } =
    getMouseGemDistance(gem)
  if (mouseGemDistance < maxDragDistance.value) {
    adjacentGemId.value = null
    return null
  }
  const gridIndexStep = getGridIndexStep(mouseGemDistanceX, mouseGemDistanceY)
  const adjacentGridIndex = gem.gridIndex + gridIndexStep
  if (!adjacentGridIndex || !checkBorder(gem.gridIndex, adjacentGridIndex)) {
    adjacentGemId.value = null
    return null
  }
  const adjacentCell = grid.value[adjacentGridIndex]
  if (!adjacentCell || !adjacentCell.gemId) {
    adjacentGemId.value = null
    return null
  }
  adjacentGemId.value = adjacentCell.gemId
  return adjacentCell.gemId
}
function getGridIndexStep(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : -1
  return dy > 0 ? gridSize.value : -gridSize.value
}
function swapGems(gemId1, gemId2) {
  const gem1 = gemsById.value[gemId1]
  const gem2 = gemsById.value[gemId2]
  const gem1Cell = grid.value[gem1.gridIndex]
  const gem2Cell = grid.value[gem2.gridIndex]
  const tempGridIndex = gem1.gridIndex
  gem1.gridIndex = gem2.gridIndex
  gem2.gridIndex = tempGridIndex
  gem1Cell.gemId = gemId2
  gem2Cell.gemId = gemId1
  gem1.swapping = true
  gem2.swapping = true
  homeGem(gemId1)
  homeGem(gemId2)
}
function checkBorder(gridIndex, adjacentIndex) {
  const currentCol = gridIndex % gridSize.value
  const adjacentCol = adjacentIndex % gridSize.value
  if (currentCol === 0 && adjacentCol === gridEdge.value) return
  if (adjacentCol === 0 && currentCol === gridEdge.value) return
  return true
}
function checkPossibleSwap(gridIndex, color, excludedGemId) {
  const row = Math.floor(gridIndex / gridSize.value)
  const col = gridIndex % gridSize.value
  const left = [0, -1]
  const right = [0, 1]
  const up = [-1, 0]
  const down = [1, 0]
  let horizontalMatches =
    1 +
    countConsecutiveMatches(row, col, right, color, excludedGemId) +
    countConsecutiveMatches(row, col, left, color, excludedGemId)
  let verticalMatches =
    1 +
    countConsecutiveMatches(row, col, down, color, excludedGemId) +
    countConsecutiveMatches(row, col, up, color, excludedGemId)
  return horizontalMatches >= MATCH || verticalMatches >= MATCH
}
function countConsecutiveMatches(row, col, direction, color, excludedGemId) {
  let count = 0
  let [directionRow, directionCol] = direction
  row += directionRow
  col += directionCol
  let gemId = getGemIdAt(row, col)
  while (
    gemId &&
    gemId !== excludedGemId &&
    gemsById.value[gemId].interactive &&
    gemsById.value[gemId].color === color
  ) {
    count++
    row += directionRow
    col += directionCol
    gemId = getGemIdAt(row, col)
  }
  return count
}
function getGemIdAt(row, col) {
  const isValidRow = row >= 0 && row < gridSize.value
  const isValidCol = col >= 0 && col < gridSize.value
  if (!isValidRow || !isValidCol) return
  return grid.value[row * gridSize.value + col].gemId
}
function onMouseDown(gemId) {
  const gem = gemsById.value[gemId]
  if (!gem.interactive) return
  if (!activeGemId.value) {
    activeGemId.value = gemId
    handleActiveGem(gemId)
    activationTime = Date.now()
    gem.element.style.zIndex = "10"
    anime.remove(gemsById.value[activeGemId.value])
  } else {
    homeGem(activeGemId.value)
  }
}
function onMouseMove(event) {
  mouse.x = event.clientX - gridRect.left
  mouse.y = event.clientY - gridRect.top
  if (activeGemId.value) handleActiveGem(activeGemId.value)
}
function onMouseUp() {
  if (!activeGemId.value) return
  const { distance } = getMouseGemDistance(gemsById.value[activeGemId.value])
  const timeExceedsDelay = Date.now() - activationTime > CLICK_DELAY
  if (timeExceedsDelay || distance > maxDragDistance.value) {
    homeGem(activeGemId.value)
  }
}
function homeGem(gemId) {
  activeGemId.value = null
  adjacentGemId.value = null
  activationTime = null
  const gem = gemsById.value[gemId]
  const { cellX, cellY } = getCellCoordinates(gem.gridIndex)
  anime({
    targets: gem,
    x: cellX,
    y: cellY,
    duration: 300,
    easing: "easeOutQuad",
    complete: () => {
      if (gem) gem.element.style.zIndex = "0" // check for already removed
      gem.swapping = false
    },
  })
}
function getCellCoordinates(gridIndex) {
  return { cellX: grid.value[gridIndex].x, cellY: grid.value[gridIndex].y }
}
function getMouseGemDistance(gem) {
  const { cellX, cellY } = getCellCoordinates(gem.gridIndex)
  const mouseGemDistanceX = mouse.x - cellX
  const mouseGemDistanceY = mouse.y - cellY
  const mouseGemDistance = Math.sqrt(
    mouseGemDistanceX ** 2 + mouseGemDistanceY ** 2
  )
  return { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance }
}
function findClosestGem(mouseX, mouseY) {
  let closestGem = null
  let minDistance = Infinity
  Object.entries(gemsById.value).forEach(([id, gem]) => {
    const distance = Math.sqrt(
      Math.pow(mouseX - gem.x, 2) + Math.pow(mouseY - gem.y, 2)
    )
    if (distance < minDistance) {
      minDistance = distance
      closestGem = { id, ...gem }
    }
  })
  return minDistance < cellSize.value ? closestGem : null
}
</script>
