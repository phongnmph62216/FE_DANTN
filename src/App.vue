<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AuthLayout from './layouts/AuthLayout.vue'
import DashboardLayout from './layouts/DashboardLayout.vue'

const route = useRoute()

const layouts = {
  AuthLayout,
  DashboardLayout,
}

const layout = computed(() => {
  const key = route.meta.layout || 'DashboardLayout'
  return layouts[key] || DashboardLayout
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
</template>
