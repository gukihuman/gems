export default function (current, target, speed) {
  if (current < target) return Math.min(current + speed, target)
  else if (current > target) return Math.max(current - speed, target)
  return current
}
