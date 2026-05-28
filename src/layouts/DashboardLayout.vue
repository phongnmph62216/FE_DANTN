<template>
  <div class="min-h-screen">
    <div class="dashboard-shell">
      <!-- Sidebar placeholder -->
      <aside class="dashboard-sidebar"></aside>
      <div class="dashboard-main">
        <!-- Header placeholder -->
        <header class="dashboard-header"></header>
        <main class="dashboard-content">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>
