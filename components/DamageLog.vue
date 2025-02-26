<template>
  <div>
    <transition-group
      name="log-entry"
      tag="div"
      class="w-80 bg-slate-600 relative flex flex-col gap-1 p-2 rounded-lg h-[293px] overflow-hidden"
    >
      <div
        v-for="log in damageLogs"
        :key="log.id"
        class="flex justify-between h-6 p-1 w-full rounded-md items-center text-slate-300"
        :class="{ 'bg-slate-700': log.color }"
      >
        <div class="flex gap-1 items-center">
          <p class="w-10">{{ log.baseDamage }}</p>
          <div
            v-for="k in log.count"
            :key="k"
            class="size-4 rounded-full saturate-50 brightness-75"
            :class="GEM_CLASSES[log.color]"
          ></div>
          <p v-if="log.count > 3">x{{ log.multiplier }}</p>
        </div>
        {{ log.fullDamage }}
      </div>
    </transition-group>
  </div>
</template>
<script setup>
const GEM_CLASSES = {
  GREEN: "green-bg",
  BLUE: "blue-bg",
  YELLOW: "yellow-bg",
  ORANGE: "orange-bg",
  PINK: "pink-bg",
}
defineProps(["damageLogs"])
</script>
<style scoped>
.log-entry-move {
  transition: transform 300ms ease;
}
.log-entry-enter-active {
  transition: all 300ms ease-in-out;
}
.log-entry-leave-active {
  transition: all 300ms ease-out;
}
.log-entry-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
.log-entry-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
