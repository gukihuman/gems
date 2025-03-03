<template>
  <div>
    <transition-group
      name="log-entry"
      tag="div"
      class="w-80 bg-gray-700 relative flex flex-col gap-1 p-2 rounded-lg h-[293px] overflow-hidden saturate-[0.5]"
    >
      <div
        v-for="log in damageLogs"
        :key="log.id"
        class="flex justify-between h-6 px-2 w-full rounded-md items-center text-green-300 bg-gray-800"
      >
        <div class="flex gap-1 items-center">
          <p class="w-10">{{ log.baseDamage }}</p>
          <div v-for="k in log.matchCount" :key="k">
            <div v-for="(img, i) in IMG_MAP" :key="`${img.color}-${i}`">
              <img
                v-if="img.color === log.matchColor"
                :src="img.src"
                class="size-4 scale-[1.2]"
              />
            </div>
          </div>
          <p v-if="log.matchCount > 3">x{{ log.multiplier }}</p>
        </div>
        {{ log.fullDamage }}
      </div>
    </transition-group>
  </div>
</template>
<script setup>
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
import { ARC, GEMS } from "~/components/constants"
const props = defineProps(["damageLogs", "arc"])
const IMG_MAP = [
  { color: GEMS.YELLOW, src: props.arc === ARC.AIM ? arrowhead : yellow },
  { color: GEMS.BLUE, src: props.arc === ARC.CRYSTAL ? shard : blue },
  { color: GEMS.GREEN, src: props.arc === ARC.MIASMA ? poison : green },
  { color: GEMS.RED, src: props.arc === ARC.BOOM ? bomb : red },
  { color: GEMS.PURPLE, src: props.arc === ARC.GAMBLER ? dice : purple },
]
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
