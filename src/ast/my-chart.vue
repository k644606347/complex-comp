<template>
    <RcpConditionChartPane :class="$style.wrap">
        <div style="display: flex; gap: 20px;">
            <b>我是电路图</b><RcpConditionContent :class="$style['my-content']" />
        </div>
        <RcpConditionChart :class="$style['my-chart']" />
        <table>
            <tr>
                <td>tdtddd</td>
            </tr>
        </table>
    </RcpConditionChartPane>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import rcpConditionChartPaneVue from './rcp-condition-chart-pane.vue'
import rcpConditionChartVue from './rcp-condition-chart.vue'
import rcpConditionContentVue from './rcp-condition-content.vue'

export default defineComponent({
    name: 'MyChart',
    components: {
        RcpConditionChart: rcpConditionChartVue,
        RcpConditionChartPane: rcpConditionChartPaneVue,
        RcpConditionContent: rcpConditionContentVue
    },
    setup() {
        return {}
    },
})
</script>
<style lang="less" module>
.wrap {
    height: 500px;
    .my-content {

    }
    .my-chart {
        flex: 1 1 auto;
    }
}
</style>