<template>
  <div :id="$style.app">
    <div :class="$style.nav">
      <router-link v-for="route in routes" :to="route.path" :key="route.name">
        {{ route.name }}</router-link>
    </div>
    <router-view :class="$style.main" />
  </div>
</template>
<script>
import { defineComponent } from "vue";
import router, { routes } from "./router";

export default defineComponent({
    name: 'App',
    setup() {
        return {
            routes: routes
        };
    },
})
</script>

<style lang="less" module>
html, body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
}
#app {
  padding: 15px;
  min-height: 100vh;
  box-sizing: border-box;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
}

.nav {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  a {
    margin-right: 16px;
    font-weight: bold;
    line-height: 36px;
    color: #2c3e50;

    &:global(.router-link-exact-active) {
      color: #42b983;
    }
  }
}
.main {
  flex: 1 1 auto;
}
</style>
