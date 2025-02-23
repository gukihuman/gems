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
const DISTANCE_PER_SECOND = 150
const REMOVE_DELAY = 500
const CLICK_DELAY = 300
const DRAG_DISTANCE = 0.7 // cell size ratio

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

const dragDistance = computed(() => cellSize.value * DRAG_DISTANCE)

onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", setGridCoordinates)
  requestAnimationFrame(gameLoop)
  addEventListener("mousemove", onMouseMove)
  addEventListener("mouseup", onMouseUp)
  addEventListener("keydown", (event) => {
    if (event.key === "o") {
      const closestGem = findClosestGem(mouse.x, mouse.y)
      if (closestGem) onMouseDown(closestGem.id)
    }
  })
})

function gameLoop() {
  generateGems()
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
  Object.values(gemsById.value).forEach((gem) => {
    const cell = grid.value[gem.gridIndex]
    gem.targetX = cell.x
    gem.targetY = cell.y
  })
}
function generateGems() {
  for (let column = gridSize.value - 1; column >= 0; column--) {
    let emptyCells = false
    let transitionOngoing = false
    for (let row = 0; row < gridSize.value; row++) {
      const i = row * gridSize.value + column
      const gem = gemsById.value[grid.value[i].gemId]
      if (!gem) emptyCells = true
      if (gem && gem.swapping) transitionOngoing = true
    }
    if (!emptyCells || transitionOngoing) continue

    let unstableColumnGems = []
    let stableGems = 0 // bottom of line
    let stableSoFar = true
    for (let row = gridSize.value - 1; row >= 0; row--) {
      const i = row * gridSize.value + column
      if (stableSoFar && grid.value[i].gemId) {
        stableGems++
        continue
      }
      if (!grid.value[i].gemId) {
        stableSoFar = false
      } else {
        unstableColumnGems.push(grid.value[i].gemId)
        grid.value[i].gemId = null
      }
    }
    unstableColumnGems.forEach((gemId, row) => {
      if (gemId === activeGemId.value) resetGem(gemId)
      const reverseRow = gridSize.value - 1 - row - stableGems
      const i = reverseRow * gridSize.value + column
      grid.value[i].gemId = gemId
      const gem = gemsById.value[gemId]
      gem.targetX = grid.value[i].x
      gem.targetY = grid.value[i].y
      gem.gridIndex = i
      animateFall(gem)
    })

    const emptyCount = gridSize.value - unstableColumnGems.length - stableGems

    for (let row = 0; row < emptyCount; row++) {
      let i = row * gridSize.value + column
      const id = newId()
      const cell = grid.value[i]
      cell.gemId = id
      gemsById.value[id] = {
        gridIndex: i,
        color: GEMS_COLORS[Math.floor(Math.random() * GEMS_COLORS.length)],
        x: cellSize.value * (i % gridSize.value) + cellSize.value / 2,
        y: -(cellSize.value * (emptyCount - row)) + cellSize.value / 2,
        targetX: cell.x,
        targetY: cell.y,
        interactive: true,
        element: null,
      }
      animateFall(gemsById.value[id])
    }
  }
}
function animateFall(gem) {
  gem.interactive = false
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
      complete: () => (gem.interactive = true),
    })
  })
}
function removeGem(gemId) {
  if (gemId === activeGemId.value) resetGem(gemId)
  const gem = gemsById.value[gemId]
  grid.value[gem.gridIndex].gemId = null
  gem.interactive = false
  gem.element.style.filter = "brightness(1.5)"
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
function updateActiveGemCoordinates(gemId) {
  const gem = gemsById.value[gemId]
  const { dx, dy, distance } = mouseGemDistance(gem)
  adjustPositionToDrag(gem, dx, dy, distance)

  if (distance > dragDistance.value) {
    let indexDifference
    if (Math.abs(dx) > Math.abs(dy)) indexDifference = dx > 0 ? 1 : -1
    else indexDifference = dy > 0 ? gridSize.value : -gridSize.value
    const adjacentGridIndex = gem.gridIndex + indexDifference
    if (adjacentGridIndex && checkBorder(gem.gridIndex, adjacentGridIndex)) {
      const adjacentCell = grid.value[adjacentGridIndex]
      if (adjacentCell && adjacentCell.gemId) {
        adjacentGemId.value = adjacentCell.gemId
        const adjacentGem = gemsById.value[adjacentCell.gemId]
        if (
          checkPossibleMatch(adjacentGridIndex, gem.color, gemId) ||
          checkPossibleMatch(
            gem.gridIndex,
            adjacentGem.color,
            adjacentGemId.value
          )
        ) {
          swapGems(gemId, adjacentGemId.value)
        }
      }
    }
  } else {
    adjacentGemId.value = null
  }
}
function swapGems(gemId1, gemId2) {
  const gem1 = gemsById.value[gemId1]
  const gem2 = gemsById.value[gemId2]
  const gem1Cell = grid.value[gem1.gridIndex]
  const gem2Cell = grid.value[gem2.gridIndex]
  const tempGridIndex = gem1.gridIndex
  gem1.gridIndex = gem2.gridIndex
  gem2.gridIndex = tempGridIndex
  gem1.targetX = gem2Cell.x
  gem1.targetY = gem2Cell.y
  gem2.targetX = gem1Cell.x
  gem2.targetY = gem1Cell.y
  gem1Cell.gemId = gemId2
  gem2Cell.gemId = gemId1
  gem1.swapping = true
  gem2.swapping = true
  resetGem(gemId1)
  resetGem(gemId2)
}
function checkBorder(index, adjacentIndex) {
  const currentCol = index % gridSize.value
  const adjacentCol = adjacentIndex % gridSize.value
  if (currentCol === 0 && adjacentCol === gridSize.value - 1) return
  if (currentCol === gridSize.value - 1 && adjacentCol === 0) return
  return true
}
function checkPossibleMatch(index, color, check) {
  const row = Math.floor(index / gridSize.value)
  const col = index % gridSize.value
  let left = col - 1
  let right = col + 1
  let top = row - 1
  let bottom = row + 1
  while (left >= 0 && getColorAt(row, left, check) === color) left--
  while (right < gridSize.value && getColorAt(row, right, check) === color)
    right++
  while (top >= 0 && getColorAt(top, col, check) === color) top--
  while (bottom < gridSize.value && getColorAt(bottom, col, check) === color)
    bottom++
  const horizontalLength = right - left - 1
  const verticalLength = bottom - top - 1
  return horizontalLength >= MATCH || verticalLength >= MATCH
}

function getColorAt(row, col, check) {
  if (row < 0 || row >= gridSize.value || col < 0 || col >= gridSize.value) {
    return
  }
  const index = row * gridSize.value + col
  const gemId = grid.value[index].gemId
  if (!gemId || gemId === check) return
  return gemsById.value[gemId].color
}
function onMouseDown(gemId) {
  const gem = gemsById.value[gemId]
  if (!gem.interactive) return
  if (!activeGemId.value) {
    activeGemId.value = gemId
    updateActiveGemCoordinates(gemId)
    activationTime = Date.now()
    gem.element.style.zIndex = "10"
    anime.remove(gemsById.value[activeGemId.value])
  } else {
    resetGem(activeGemId.value)
  }
}
function onMouseMove(event) {
  mouse.x = event.clientX - gridRect.left
  mouse.y = event.clientY - gridRect.top
  if (!activeGemId.value) return
  updateActiveGemCoordinates(activeGemId.value)
}
function onMouseUp() {
  if (!activeGemId.value) return
  const { distance } = mouseGemDistance(gemsById.value[activeGemId.value])
  if (
    Date.now() - activationTime > CLICK_DELAY ||
    distance > dragDistance.value
  ) {
    resetGem(activeGemId.value)
  }
}
function resetGem(gemId) {
  activeGemId.value = null
  adjacentGemId.value = null
  activationTime = null
  const gem = gemsById.value[gemId]
  nextTick(() => {
    anime({
      targets: gem,
      x: gem.targetX,
      y: gem.targetY,
      duration: 300,
      easing: "easeOutQuad",
      complete: () => {
        if (gem) gem.element.style.zIndex = "0" // check for already removed
        gem.swapping = false
      },
    })
  })
}
function mouseGemDistance(gem) {
  const dx = mouse.x - gem.targetX
  const dy = mouse.y - gem.targetY
  return { dx, dy, distance: Math.sqrt(dx ** 2 + dy ** 2) }
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
function adjustPositionToDrag(gem, dx, dy, distance) {
  if (distance < dragDistance.value) {
    gem.x = mouse.x
    gem.y = mouse.y
    return
  }
  const angle = Math.atan2(dy, dx)
  gem.x = gem.targetX + dragDistance.value * Math.cos(angle)
  gem.y = gem.targetY + dragDistance.value * Math.sin(angle)
}
</script>
