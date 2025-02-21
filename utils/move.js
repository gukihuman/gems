const FACTOR = 0.05
const MIN_SPEED = 1

export default function (current, target) {
  const diff = target - current
  if (Math.abs(diff) < 0.5) return target
  const direction = Math.sign(diff)
  const speed = Math.max(Math.abs(FACTOR * diff), MIN_SPEED)
  return current + direction * speed
}
