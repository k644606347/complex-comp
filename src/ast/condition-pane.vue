<template>
    <div :class="$style.wrap" v-html="content"></div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    props: {
        content: { type: String, default: ''},
    },
    name: 'ConditionPane',
    setup() {
        return {};
    },
})
</script>
<style lang="less" module>
.wrap {
    //
}
</style>