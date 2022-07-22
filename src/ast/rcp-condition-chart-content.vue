<template>
    <div class="rcp-condition-chart-content" v-html="content"></div>
</template>
<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useContext } from './utils';

export default defineComponent({
    name: 'RcpConditionContent',
    setup() {
        const context = useContext();
        return {
            content: computed(() => context?.chartData.conditionHtml),
        };
    },
})
</script>
<style lang="less">
.rcp-condition-chart-content {
    display: flex;
    align-items: center;
    font-size: 14px;
    line-height: 24px;
    span {
        margin: 0;
        padding: 0 2px;
    }
}

.rcp-condition-chart-item {
    cursor: pointer;
    border-bottom: 2px solid transparent;
    &:hover {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        border-bottom-color: #326BFB;
    }
}

.rcp-condition-chart-item-actived {
    border-radius: 4px;
    background-color: #326BFB;
    color: #fff;
}
</style>