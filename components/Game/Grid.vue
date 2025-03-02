<template>
  <div class="max-w-[500px] h-fit w-full p-1">
    <div
      ref="gridRef"
      v-if="pause"
      class="flex items-center justify-center text-gray-300 aspect-square cursor-default text-3xl pb-2"
    >
      pause
    </div>
    <div
      v-else
      ref="gridRef"
      class="relative grid aspect-square duration-200 overflow-hidden"
      :class="{ 'saturate-50 opacity-50': pause }"
      :style="{ 'grid-template-columns': `repeat(${size}, minmax(0, 1fr))` }"
    >
      <img
        :src="gridImg"
        class="rounded-2xl absolute opacity-50"
        draggable="false"
        @dragstart.prevent
      />
      <img
        v-for="i in size ** 2"
        :key="i"
        :src="cell"
        draggable="false"
        @dragstart.prevent
      />
      <div
        v-for="(gem, id) in gemsById"
        :key="id"
        class="absolute group w-full"
        :ref="(element) => (gem.element = element)"
        @mousedown="onMouseDown(id)"
        draggable="false"
        @dragstart.prevent
        :style="{
          left: gem.x - cellSize / 2 + 'px',
          top: gem.y - cellSize / 2 + 'px',
          width: cellSize + 'px',
          height: cellSize + 'px',
        }"
      >
        <div v-for="(img, i) in IMG_MAP" :key="`gem-${img.color}-${id}-${i}`">
          <img
            v-if="img.color === gem.color"
            :src="img.src"
            class="ease-out-in select-none"
            :class="[
              {
                'scale-1': !gem.cascading && id !== activeGemId,
                'group-hover:brightness-150 group-hover:scale-[1.15] group-hover:rotate-[2deg]':
                  !activeGemId &&
                  !gem.cascading &&
                  !gem.removing &&
                  (arc !== ARC.CRYSTAL || gem.color !== GEMS.BLUE),
                'scale-[0.8] brightness-150': id === activeGemId,
                'scale-[0.83] saturate-[0.25]': gem.cascading,
                'scale-[1.2] opacity-0 rotate-[10deg]': gem.removing,
              },
            ]"
            :style="{
              rotate: gem.rotation + 'deg',
              'transition-duration': `${gem.removing ? REMOVE_DELAY : 200}ms`,
            }"
          />
        </div>
      </div>
    </div>
    <div class="pt-10 text-gray-400 text-center">{{ formattedTime }}</div>
  </div>
</template>
<script setup>
/** x and y are always pixel coordinates within grid, grid itself uses row / col as coordinates and flat indices */
import newId from "~/utils/newId"
import debounce from "~/utils/debounce"

import gridImg from "~/assets/grid_warm.png"
import cell from "~/assets/cell.png"
import yellow from "~/assets/yellow.png"
import blue from "~/assets/blue.png"
import green from "~/assets/green.png"
import red from "~/assets/red.png"
import purple from "~/assets/purple.png"
import arrowhead from "~/assets/arrowhead.png"
import shard from "~/assets/shard.png"
import poison from "~/assets/poison.png"
import bomb from "~/assets/bomb.png"
import dice from "~/assets/dice.png"

import { MIN_MATCH, MAX_MATCH_COUNT, ARC, GEMS } from "~/components/constants"
const GRID_SIZE = 8
const AIM_GRID_SIZE = 10
const REMOVE_DELAY = 350
const REMOVE_FLUCTUATION = 120
const REMOVE_ROTATE = 20
const CLICK_DELAY = 300
const DELAY_AFTER_RESIZE = 50
const MAX_DRAG_DISTANCE = 0.7 // ratio based on cell size
const MAX_VELOCITY = 400
const MAX_DELTA_TIME = 0.05 // cap at 1/20th of a second in case of lag
const ACCELERATION = 700
const MOUSE_ACCELERATION = 2000
const MOUSE_DAMPING = 0.3
const DAMPING = 0.7

const props = defineProps(["pause", "arc"])
const emit = defineEmits(["match", "shard-count"])
const size = ref(props.arc === ARC.AIM ? AIM_GRID_SIZE : GRID_SIZE)
const gridRef = ref(null)
const gemsById = ref({})
const cellSize = ref(0)
const grid = Array.from(Array(size.value ** 2), () => ({
  gemId: null,
  x: 0,
  y: 0,
}))
const activeGemId = ref(null)
const maxDragDistance = computed(() => cellSize.value * MAX_DRAG_DISTANCE)
const gridEdge = size.value - 1
const mouse = { x: 0, y: 0 }
const debouncedAfterResize = debounce(() => {
  Object.values(gemsById.value).forEach((gem) => (gem.cascading = true))
}, DELAY_AFTER_RESIZE)
let adjacentGemId = null
let activationTime = null
let gridRect = null
let lastTime = performance.now()
let isTabActive = true
const IMG_MAP = [
  { color: GEMS.YELLOW, src: props.arc === ARC.AIM ? arrowhead : yellow },
  { color: GEMS.BLUE, src: props.arc === ARC.CRYSTAL ? shard : blue },
  { color: GEMS.GREEN, src: props.arc === ARC.MIASMA ? poison : green },
  { color: GEMS.RED, src: props.arc === ARC.BOOM ? bomb : red },
  { color: GEMS.PURPLE, src: props.arc === ARC.GAMBLER ? dice : purple },
]
onMounted(() => {
  setGridCoordinates()
  addEventListener("resize", onResize)
  addEventListener("mousemove", onMouseMove)
  addEventListener("mouseup", onMouseUp)
  addEventListener("keydown", onKeyDown)
  requestAnimationFrame(gameLoop)
  lastTime = performance.now()
  document.addEventListener("visibilitychange", onVisibilityChange)
})
function onVisibilityChange() {
  isTabActive = !document.hidden
  if (isTabActive) lastTime = performance.now()
}
// core
const elapsedTime = ref(0)
const formattedTime = computed(() => {
  const totalSeconds = Math.round(elapsedTime.value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
})
function gameLoop(currentTime) {
  if (!isTabActive || props.pause) {
    requestAnimationFrame(gameLoop)
    return
  }
  let deltaTime = (currentTime - lastTime) / 1000
  deltaTime = Math.min(deltaTime, MAX_DELTA_TIME) // cap lags
  lastTime = currentTime
  elapsedTime.value = elapsedTime.value + deltaTime

  cascadeGems()
  Object.values(gemsById.value).forEach((gem) => move(gem, deltaTime))
  resolveMatches()
  // updateFade()
  if (activeGemId.value) handleActiveGem(activeGemId.value)

  requestAnimationFrame(gameLoop)
}
// Update move function
function getMouseHomeCoordinates(gem) {
  // mouse active handle
  if (grid[gem.gridIndex].gemId === activeGemId.value) {
    const { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance } =
      getMouseGemDistance(gem)
    if (mouseGemDistance < maxDragDistance.value) {
      return {
        homeX: mouse.x,
        homeY: mouse.y,
        acceleration: MOUSE_ACCELERATION,
        damping: MOUSE_DAMPING,
      }
    } else {
      const angle = Math.atan2(mouseGemDistanceY, mouseGemDistanceX)
      let { homeX, homeY } = getHomeCoordinates(gem.gridIndex)
      return {
        homeX: homeX + maxDragDistance.value * Math.cos(angle),
        homeY: homeY + maxDragDistance.value * Math.sin(angle),
        acceleration: MOUSE_ACCELERATION,
        damping: MOUSE_DAMPING,
      }
    }
  } else {
    return {
      ...getHomeCoordinates(gem.gridIndex),
      acceleration: ACCELERATION,
      damping: DAMPING,
    }
  }
}
function move(gem, deltaTime) {
  const { homeX, homeY, acceleration, damping } = getMouseHomeCoordinates(gem)

  const dx = homeX - gem.x
  const dy = homeY - gem.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Proportional velocity based on distance (no overshoot)
  const targetVelocityX = dx * acceleration * deltaTime
  const targetVelocityY = dy * acceleration * deltaTime

  // Smoothly interpolate current velocity toward target
  gem.velocityX = (gem.velocityX + targetVelocityX) * damping
  gem.velocityY = (gem.velocityY + targetVelocityY) * damping

  // Cap velocity
  const speed = Math.sqrt(
    gem.velocityX * gem.velocityX + gem.velocityY * gem.velocityY
  )
  if (speed > MAX_VELOCITY) {
    const scale = MAX_VELOCITY / speed
    gem.velocityX *= scale
    gem.velocityY *= scale
  }

  // Update position
  gem.x += gem.velocityX * deltaTime
  gem.y += gem.velocityY * deltaTime

  // Only snap when not dragging
  if (distance < 1 && speed < 10) {
    gem.x = homeX
    gem.y = homeY
    gem.velocityX = 0
    gem.velocityY = 0
    if (gem.cascading) gem.cascading = false
    if (gem.swapping) {
      gem.swapping = false
      if (gem.element) gem.element.style.zIndex = "0"
    }
  }
}
function setGridCoordinates() {
  gridRect = gridRef.value.getBoundingClientRect()
  cellSize.value = gridRect.width / size.value
  grid.forEach((cell, i) => {
    cell.x = cellSize.value * (i % size.value) + cellSize.value / 2
    cell.y = cellSize.value * Math.floor(i / size.value) + cellSize.value / 2
  })
}
function getHomeCoordinates(gridIndex) {
  return { homeX: grid[gridIndex].x, homeY: grid[gridIndex].y }
}
function cascadeGems() {
  for (let col = 0; col <= gridEdge; col++) {
    for (let row = gridEdge; row >= 0; row--) {
      const gridIndex = row * size.value + col
      const gem = gemsById.value[grid[gridIndex].gemId]
      if (gem && !gem.removing) {
        const newGridIndex = findBottomEmptySpot(col, row)
        if (newGridIndex !== gridIndex) {
          if (grid[gridIndex].gemId === activeGemId.value) {
            activeGemId.value = null
          }
          grid[newGridIndex].gemId = grid[gridIndex].gemId
          grid[gridIndex].gemId = null
          gem.gridIndex = newGridIndex
          gem.cascading = true
        }
      }
    }
    generateNewGems(col)
  }
}
function findBottomEmptySpot(col, startRow) {
  let targetIndex = startRow * size.value + col
  for (let row = startRow + 1; row <= gridEdge; row++) {
    const nextIndex = row * size.value + col
    const gem = gemsById.value[grid[nextIndex].gemId]
    if (!gem) targetIndex = nextIndex
  }
  return targetIndex
}
function generateNewGems(col) {
  let topEmptyCount = 0
  for (let row = 0; row < size.value; row++) {
    const gridIndex = row * size.value + col
    if (!grid[gridIndex].gemId) topEmptyCount++
    else break
  }
  let cascadingCount = 0
  for (let row = 0; row < size.value; row++) {
    const gridIndex = row * size.value + col
    const gem = gemsById.value[grid[gridIndex].gemId]
    if (gem && gem.cascading) cascadingCount++
  }
  if (topEmptyCount === 0) return
  for (let row = 0; row < topEmptyCount; row++) {
    const gridIndex = row * size.value + col
    const id = newId()
    grid[gridIndex].gemId = id
    const { homeX } = getHomeCoordinates(gridIndex)
    gemsById.value[id] = {
      gridIndex,
      color: Math.floor(Math.random() * Object.keys(GEMS).length),
      x: homeX,
      y:
        -(cellSize.value * (topEmptyCount + cascadingCount - row)) +
        cellSize.value / 2,
      velocityX: 0,
      velocityY: 0,
      fadeProgress: 1,
      removing: null,
      removingAnimTime: Infinity,
      cascading: true,
      swapping: false,
      element: null,
      rotation: 0,
    }
  }
}
// match
function resolveMatches() {
  const matchedGemIds = new Set()
  for (let row = 0; row < size.value; row++) {
    const startIndex = row * size.value
    checkLine(matchedGemIds, startIndex, 1)
  }
  for (let startIndex = 0; startIndex < size.value; startIndex++) {
    checkLine(matchedGemIds, startIndex, size.value)
  }
  matchedGemIds.forEach((gemId) => {
    removeGem(gemId)
    if (
      props.arc === ARC.CRYSTAL &&
      gemsById.value[gemId].color === GEMS.BLUE
    ) {
      emit("shard-count")
    }
  })
}
function checkLine(matchedGemIds, startIndex, step) {
  let singleColorLine = [] // gemIds
  let color = null
  let matchCount = 1
  for (let i = 0; i < size.value; i++) {
    const gemId = grid[startIndex + i * step].gemId
    const gem = gemsById.value[gemId]
    if (!gem) return
    if (gem.cascading || gem.removing) {
      resolveLine(matchedGemIds, singleColorLine, color, matchCount)
      singleColorLine = []
      color = null
      matchCount = 1
      continue
    }
    if (gem.color === color) {
      singleColorLine.push(gemId)
      matchCount++
    } else {
      resolveLine(matchedGemIds, singleColorLine, color, matchCount)
      singleColorLine = [gemId]
      color = gem.color
      matchCount = 1
    }
  }
  resolveLine(matchedGemIds, singleColorLine, color, matchCount)
}
function resolveLine(matchedGemIds, singleColorLine, color, matchCount) {
  let matchToCheck = MIN_MATCH
  if (props.arc === ARC.AIM && color === GEMS.YELLOW) {
    matchToCheck += 1
  } else if (props.arc === ARC.CRYSTAL && color === GEMS.BLUE) {
    matchToCheck -= 1
  }

  if (matchCount < matchToCheck) return
  singleColorLine.forEach((gemId) => matchedGemIds.add(gemId))
  emit("match", color, Math.min(matchCount, MAX_MATCH_COUNT))
}
// gem manipulation and animation

function homeGem(gemId) {
  activeGemId.value = null
  adjacentGemId = null
  activationTime = null
}
function removeGem(gemId) {
  if (gemId === activeGemId.value) homeGem(gemId)
  const gem = gemsById.value[gemId]
  gem.removing = true
  gem.removingAnimTime = performance.now() + Math.random() * REMOVE_FLUCTUATION
  gem.targetRotation = (Math.random() < 0.5 ? -1 : 1) * REMOVE_ROTATE
  setTimeout(() => {
    grid[gem.gridIndex].gemId = null
    delete gemsById.value[gemId]
  }, REMOVE_DELAY)
}
// interact
function handleActiveGem(gemId) {
  const activeGem = gemsById.value[gemId]
  adjacentGemId = getAdjacentGemId(activeGem)
  if (!adjacentGemId) return
  const adjacentGem = gemsById.value[adjacentGemId]
  if (adjacentGem.cascading || adjacentGem.removing) return
  if (
    checkPossibleSwap(adjacentGem.gridIndex, activeGem.color, gemId) ||
    checkPossibleSwap(activeGem.gridIndex, adjacentGem.color, adjacentGemId)
  ) {
    swapGems(gemId, adjacentGemId)
  }
}
function getAdjacentGemId(gem) {
  const { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance } =
    getMouseGemDistance(gem)
  if (mouseGemDistance < maxDragDistance.value) return null
  const gridIndexStep = getGridIndexStep(mouseGemDistanceX, mouseGemDistanceY)
  const adjacentGridIndex = gem.gridIndex + gridIndexStep
  if (!adjacentGridIndex || !checkBorder(gem.gridIndex, adjacentGridIndex)) {
    return null
  }
  const adjacentCell = grid[adjacentGridIndex]
  if (!adjacentCell || !adjacentCell.gemId) return null
  return adjacentCell.gemId
}
function getGridIndexStep(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 1 : -1
  return dy > 0 ? size.value : -size.value
}
function checkBorder(gridIndex, adjacentIndex) {
  const currentCol = gridIndex % size.value
  const adjacentCol = adjacentIndex % size.value
  if (currentCol === 0 && adjacentCol === gridEdge) return
  if (adjacentCol === 0 && currentCol === gridEdge) return
  return true
}
function checkPossibleSwap(gridIndex, color, excludedGemId) {
  const row = Math.floor(gridIndex / size.value)
  const col = gridIndex % size.value
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
  let matchToCheck = MIN_MATCH
  if (props.arc === ARC.AIM && color === GEMS.YELLOW) {
    matchToCheck += 1
  }
  if (props.arc === ARC.CRYSTAL && color === GEMS.BLUE) {
    return
  }
  return horizontalMatches >= matchToCheck || verticalMatches >= matchToCheck
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
    !gemsById.value[gemId].cascading &&
    !gemsById.value[gemId].removing &&
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
  const isValidRow = row >= 0 && row < size.value
  const isValidCol = col >= 0 && col < size.value
  if (!isValidRow || !isValidCol) return
  return grid[row * size.value + col].gemId
}
function swapGems(gemId1, gemId2) {
  const gem1 = gemsById.value[gemId1]
  const gem2 = gemsById.value[gemId2]
  const gem1Cell = grid[gem1.gridIndex]
  const gem2Cell = grid[gem2.gridIndex]
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
function getMouseGemDistance(gem) {
  const { homeX, homeY } = getHomeCoordinates(gem.gridIndex)
  const mouseGemDistanceX = mouse.x - homeX
  const mouseGemDistanceY = mouse.y - homeY
  const mouseGemDistance = Math.sqrt(
    mouseGemDistanceX ** 2 + mouseGemDistanceY ** 2
  )
  return { mouseGemDistanceX, mouseGemDistanceY, mouseGemDistance }
}
// input
function onResize() {
  setGridCoordinates()
  Object.values(gemsById.value).forEach((gem) => (gem.cascading = true))
  debouncedAfterResize()
}
function onMouseDown(gemId) {
  const gem = gemsById.value[gemId]
  if (gem.cascading || gem.removing) return
  if (props.arc === ARC.CRYSTAL && gem.color === GEMS.BLUE) {
    return
  }
  if (!activeGemId.value) {
    activeGemId.value = gemId
    handleActiveGem(gemId)
    activationTime = Date.now()
    gem.element.style.zIndex = "10"
  } else {
    homeGem(activeGemId.value)
  }
}
function onKeyDown(event) {
  if (event.key !== "o") return
  if (activeGemId.value) {
    homeGem(activeGemId.value)
    return
  }
  if (mouse.x < 0 || mouse.x > gridRect.width) return
  if (mouse.y < 0 || mouse.y > gridRect.height) return
  let closestGemId = null
  let minDistanceSquared = Infinity
  Object.entries(gemsById.value).forEach(([id, gem]) => {
    const distance = (mouse.x - gem.x) ** 2 + (mouse.y - gem.y) ** 2
    if (distance < minDistanceSquared) {
      minDistanceSquared = distance
      closestGemId = id
    }
  })
  onMouseDown(closestGemId)
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
</script>
