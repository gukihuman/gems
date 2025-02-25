<template>
  <div
    class="flex gap-2 justify-center items-center h-screen bg-slate-500 bg-circles"
  >
    <div class="w-12"></div>
    <Grid :size="8" :min-match="3" @match="handleMatch" />
    <DamageLog />
  </div>
</template>
<script setup>
function handleMatch(color, matchCount) {
  // console.log(color, matchCount)
}
</script>
