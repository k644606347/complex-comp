<template>
    <RcpConditionChartPane :value="conditionContent" :conditions="conditions" :class="$style.wrap">
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
import { defineComponent, ref } from 'vue'
import rcpConditionChartPaneVue from './rcp-condition-chart-pane.vue'
import rcpConditionChartVue from './rcp-condition-chart.vue'
import rcpConditionContentVue from './rcp-condition-chart-content.vue'
import { ICondition } from './utils'

export default defineComponent({
    name: 'MyChart',
    components: {
        RcpConditionChart: rcpConditionChartVue,
        RcpConditionChartPane: rcpConditionChartPaneVue,
        RcpConditionContent: rcpConditionContentVue
    },
    setup() {
        const conditionContent = ref("3 && 1 && (2 || 13) && !(!4 && 5 || !!(!6 && !3)) || 7 && 8 && !9 && 10 && (11 || 12) && !(13 && 14 || !15)");
        const conditions = ref<ICondition[]>([
            { 
                seq: 1,
                result: true,
                value: 'startTime > 123'
            },
            { 
                seq: 2,
                result: true,
                value: 'sourceId === "sss"'
            },
            { 
                seq: 3,
                result: true,
                value: 'timestamp > 4567'
            },
            { 
                seq: 4,
                result: true,
                value: 'endTime > 5555'
            },
            { 
                seq: 5,
                result: true,
                value: 'sourceId !== "hehe"'
            },
            { 
                seq: 6,
                result: true,
                value: 'source == "haha"'
            },
            { 
                seq: 7,
                result: true,
                value: 'sourceId !== "hihi"'
            },
            { 
                seq: 8,
                result: true,
                value: 'sourceId'
            },
        ]);
        // default: "3 && 1 && (2 || 13) && !(!4 && 5 || !!(!6 && !3)) || 7 && 8 && !9 && 10 && (11 || 12) && !(13 && 14 || !15)",
        // default: "3 || 1 && 2 || 3 && 3 && !((4 && 5 || !(5 && !6)) || 7) || !(8 || 9 || 10)",
        // default: '1 && !(2 || 3 || 4) && !(5 && 6) || (7 || !(4 && 8 || !(!2 || !10)))'
        // default: '1 && !(2 || 3) && 5'
        return {
            conditionContent,
            conditions,
        }
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