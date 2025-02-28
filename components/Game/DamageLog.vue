<template>
  <div>
    <transition-group
      name="log-entry"
      tag="div"
      class="w-80 bg-gray-600 relative flex flex-col gap-1 p-2 rounded-lg h-[293px] overflow-hidden"
    >
      <div
        v-for="log in damageLogs"
        :key="log.id"
        class="flex justify-between h-6 px-2 w-full rounded-md items-center text-gray-300"
        :class="{ 'bg-gray-700': log.color }"
      >
        <div class="flex gap-1 items-center">
          <p class="w-10">{{ log.baseDamage }}</p>
          <div v-for="k in log.count" :key="k">
            <img
              class="size-4 scale-[1.2] saturate-50 brightness-75"
              v-if="arc === ARC.AIM && log.color === GEMS.YELLOW"
              :src="arrowhead"
            />
            <img
              class="size-4 scale-[1.25] saturate-50 brightness-75"
              v-else-if="arc === ARC.CRYSTAL && log.color === GEMS.BLUE"
              :src="shard"
            />
          </div>
          <p v-if="log.count > 3">x{{ log.multiplier }}</p>
        </div>
        {{ log.fullDamage }}
      </div>
    </transition-group>
  </div>
</template>
<script setup>
import arrowhead from "~/assets/arrowhead.webp"
import shard from "~/assets/shard.webp"
import { ARC, GEMS } from "~/components/constants"
defineProps(["damageLogs", "arc"])
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
  transform: trangrayY(-10px);
}
.log-entry-leave-to {
  opacity: 0;
  transform: trangrayY(10px);
}
</style>
