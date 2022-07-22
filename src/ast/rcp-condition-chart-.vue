<template>
    <div class="rcp-condition-chart-wrap" ref="wrapRef">
        <slot>
            <RcpConditionContent :class="$style['condition-content']" />
            <RcpConditionChart :class="$style['chart']" />
        </slot>
    </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, PropType, provide, reactive, ref, watch } from 'vue'
import { parse } from "@babel/parser";
import { Expression } from "@babel/types/lib/index";
import { astToChartData, contextKey, emits, ICondition, IConditionChartContext, initChartData } from './utils';
import RcpConditionContent from './rcp-condition-chart-content.vue';
import RcpConditionChart from './rcp-condition-chart.vue';

export default defineComponent({
    name: 'RcpConditionChartPane',
    components: {
        RcpConditionContent,
        RcpConditionChart
    },
    props: {
        value: {
            type: String,
            default: "3 && 1 && (2 || 13) && !(!4 && 5 || !!(!6 && !3)) || 7 && 8 && !9 && 10 && (11 || 12) && !(13 && 14 || !15)",
            // default: "3 || 1 && 2 || 3 && 3 && !((4 && 5 || !(5 && !6)) || 7) || !(8 || 9 || 10)",
            // default: '1 && !(2 || 3 || 4) && !(5 && 6) || (7 || !(4 && 8 || !(!2 || !10)))'
            // default: '1 && !(2 || 3) && 5'
        },
        // value: { type: String, default: "1 || 2 || 3 && 4 || 5" },
        conditions: {
            type: Array as PropType<ICondition[]>, 
            default: () => ([]) as ICondition[]
        }
    },
    emits: emits,
    setup(props, { emit }) {
        const ast = genAst(props.value);
        const wrapRef = ref<HTMLElement>();
        const context = reactive<IConditionChartContext>({
            ast: Object.freeze(genAst(props.value)),
            chartData: Object.freeze(genChartData(ast)),
            dispatch(...args) {
                emit(...args);
            },
            wrapEl: undefined
        });
        provide(contextKey, context)
        
        watch(() => props.value, (newValue) => {
            context.ast = Object.freeze(genAst(newValue));
        });

        watch(() => context.ast, (newAst) => {
            context.chartData = Object.freeze(genChartData(newAst));
        });

        onMounted(() => {
            context.wrapEl = wrapRef.value;
        });

        function genAst(content: string) {
            const ast = parse(content, {
                // createParenthesizedExpressions: true,
                tokens: true,
            });
            console.log("ast", ast);
            const firstNode = ast.program.body[0];
            const expression = firstNode.type === "ExpressionStatement" ? firstNode.expression : null;
            return expression;
        }
        
        function genChartData(ast?: Expression | null) {
            if (!ast) {
                return initChartData();
            }

            return astToChartData(ast, props.conditions);
        }

        return {
            context,
            wrapRef,
        };
    },
})
</script>
<style lang="less">
.rcp-condition-chart-wrap {
  display: flex;
  flex-direction: column;
  font-size: 14px;
}

</style>
<style lang="less" module>
    .chart {
        flex: 1 1 auto;
    }

    .condition-content {
        align-self: flex-end;
    }


    .condition-content + .chart {
        margin-top: 16px;
    }
</style>