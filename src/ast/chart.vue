<template>
  <div :class="$style.wrap">
    <div>{{ code }}</div>
    <div id="chart1" :class="$style.chart"></div>
  </div>
</template>
<script lang="ts">
import {
    computed,
    defineComponent,
    nextTick,
    onMounted,
    PropType,
    useCssModule,
} from "vue";
import { parse } from "@babel/parser";
import { Expression } from "@babel/types/lib/index";
import G6, { ComboConfig, EdgeConfig, NodeConfig, ShapeStyle } from "@antv/g6";

type ICondition = {
    seq: number;
    result: boolean;
    value: string;
}
type ChartData = {
    nodes: Array<NodeConfig & {
        meta: {
            next?: string[];
            seq?: number;
        }
    }>;
    edges: Array<EdgeConfig>;
    combos: Array<ComboConfig>;
};
export default defineComponent({
    props: {
        code: {
            type: String,
            // default: "3 || 1 && 2 || 3 && 3 && !((4 && 5 || !(5 && !6)) || 7) || 5 && 3 || 8 || 9 || 10 || (11 && 12 || !(13) && (14 || 15))",
            // default: "3 || 1 && 2 || 3 && 3 && !((4 && 5 || !(5 && !6)) || 7) || !(8 || 9 || 10)",
            default: '1 && 1.1 && 1.2 && !(2 || 3 || 4) && !(5 && 6) || (7 || !(4 && 8 || !(!2 || !10)))'
            // default: '1 && (2 || 3 || 4) && 5'
        },
        // code: { type: String, default: "1 || 2 || 3 && 4 || 5" },
        conditions: {
            type: Array as PropType<ICondition[]>, 
            default: () => ([
                { 
                    seq: 1,
                    result: true,
                    value: 'startTime > 123'
                },
                { 
                    seq: 2,
                    result: false,
                    value: 'sourceId === "sss"'
                },
                { 
                    seq: 3,
                    result: false,
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
            ]) as ICondition[]
        }
    },
    name: "ChartDemo",
    setup(props) {
        const ast = computed(() => {
            const edges = parse(props.code, {
                // createParenthesizedExpressions: true,
                tokens: true,
            });
            console.log("ast", edges);
            const firstNode = edges.program.body[0];
            const expression =
        firstNode.type === "ExpressionStatement" ? firstNode.expression : null;
            console.log("edges", props.code, expression);
            return expression;
        });

        function codeToChart(code: string, ast: any) {
            let result: ChartData = { nodes: [], edges: [], combos: [] };

            const startNode: ChartData['nodes'][number] = {
                id: "start",
                label: "开始",
                meta: {},
                linkPoints: {
                    right: true,
                },
            };
            result = astToChartEdges(ast, [startNode]);
            result.nodes.push(startNode);
            result.nodes.push({
                id: "end",
                label: "结束",
                meta: {},
            });
            
            const ignoreNodes = ['start', 'end'];
            result.nodes.forEach((node) => {
                if (ignoreNodes.includes(node.id)) {return}
                if (!node.meta.next) {
                    node.meta.next = ["end"];
                    result.edges.push({
                        source: node.id,
                        target: "end",
                        style: initEdgeStyle(props.conditions.find(condition => condition.seq === node.meta.seq)?.result),
                    });
                }
            });
            return result;
        }

        function astToChartEdges(
            expression: Expression,
            parentNodes: ChartData["nodes"],
            parentCombo?: string
        ) {
            const result: ChartData = { nodes: [], edges: [], combos: [] };
            if (!expression) return result;

            if (expression.type === "LogicalExpression") {
                // const parenthesized = expression.left.extra?.parenthesized;
                const leftData = astToChartEdges(expression.left, parentNodes, parentCombo);
                result.edges = result.edges.concat(leftData.edges);
                result.nodes = result.nodes.concat(leftData.nodes);
                result.combos = result.combos.concat(leftData.combos);
                // console.log('parenthesized', parenthesized)
                const nextParents = expression.operator === "&&"
                    ? result.nodes.filter(node => !node.meta?.next)
                    : parentNodes;
                // console.log('nextParents', nextParents, JSON.stringify(result.nodes))
                const rightData = astToChartEdges(expression.right, nextParents, parentCombo);
                result.edges = result.edges.concat(rightData.edges);
                result.nodes = result.nodes.concat(rightData.nodes);
                result.combos = result.combos.concat(rightData.combos);
            } else if (expression.type === "NumericLiteral") {
                const nodeId = expression.value + '_' + Math.ceil(Math.random() * 100000000).toString(16);
                parentNodes.forEach(parentNode => {
                    if (!parentNode.meta.next) {
                        parentNode.meta.next = [];
                    }
                    parentNode.meta.next.push(nodeId);
                
                    const parentConditionResult = parentNode.id === 'start' ? true : props.conditions.find(condtion => Number(condtion.seq) === Number(parentNode.meta.seq))?.result;
                    const conditionResult = props.conditions.find(condtion => Number(condtion.seq) === Number(expression.value))?.result;
                    console.log('parent', parentNode, props.conditions.find(condtion => Number(condtion.seq) === Number(parentNode.meta.seq)));
                    console.log('cur', expression.value, props.conditions.find(condtion => Number(condtion.seq) === Number(expression.value))?.result)
                    result.edges.push({
                        source: parentNode.id,
                        target: nodeId,
                        style: initEdgeStyle(parentConditionResult && conditionResult),
                    });
                    result.nodes.push({
                        comboId: parentCombo,
                        id: nodeId,
                        label: "条件" + String(expression.value),
                        meta: {
                            seq: expression.value,
                        },
                        labelCfg: {
                            style: {
                                fill: conditionResult ? '#30C453' : '#FA4E3E'
                            }
                        },
                        linkPoints: {
                            right: true,
                        },
                    });  
                })
            } else if (expression.type === 'UnaryExpression' && expression.operator === '!') {
                const comboId = 'combo_' + Math.ceil(Math.random() * 1000000).toString(16);
                result.combos.push({
                    id: comboId,
                    parentId: parentCombo,
                    style: {
                        fill: '#FFAA00',
                        stroke: '#FFAA00',
                        lineDash: [2],
                    },
                })
                const children = astToChartEdges(expression.argument, parentNodes, comboId);
                result.edges = result.edges.concat(children.edges);
                result.nodes = result.nodes.concat(children.nodes);
                result.combos = result.combos.concat(children.combos);
            } else {
                return result;
            }

            return result;
        }

        const $style = useCssModule();
        const chartData = computed(() => {
            const data = codeToChart(props.code, ast.value);
            return data;
        });

        onMounted(async () => {
            await nextTick();
            initChart(chartData.value, $style);
        });

        return {
            ast,
            chartData,
        };
    },
});

function initEdgeStyle(condtionResult?: boolean): ShapeStyle {
    const color = condtionResult ? '#326BFB' : '#BBBDBF';
    return {
        // endArrow: true,
        endArrow: {
            path: G6.Arrow.triangle(6, 6, 0),
            // path: "M 0,0 L 8,4 L 8,-4 Z",
            fill: color,
        },
        stroke: color,
        lineWidth: 1.5,
        radius: 20,
    }
}

function initChart(data: ChartData, $styles: Record<string, string>) {
    const container = document.getElementById("chart1")!;
    // const width = container.scrollWidth;
    // const height = container.scrollHeight || 500;

    const toolbar = new G6.ToolBar();
    const minimap = new G6.Minimap({
        size: [100, 100],
        className: $styles.minimap,
        type: "delegate",
    });
    const graph = new G6.Graph({
        container: container,
        // width,
        // height,
        fitView: true,
        fitCenter: true,
        groupByTypes: false,
        modes: {
            default: [
                "drag-canvas",
                // "drag-node",
                "zoom-canvas",
                "click-select",
            ],
        },
        plugins: [minimap, toolbar],
        layout: {
            type: "dagre",
            rankdir: "LR",
            // align: "UL",
            controlPoints: true,
            sortByCombo: true,
            // nodesepFunc: () => 20,
            // ranksepFunc: () => 15,
        },
        defaultNode: {
            size: [85, 52],
            // type: "alps",
            type: "rect",
            style: {
                fontSize: 14,
                lineWidth: 1,
                stroke: "#F0F2F5",
                fill: "#fff",
                radius: 4,
            },
        },
        nodeStateStyles: {
            selected: {
                stroke: '#326BFB',
                lineWidth: 1.5,
            },
        },
        defaultEdge: {
            type: "polyline",
            size: 1,
        },
        defaultCombo: {
            type: 'rect',
            padding: 16,
            style: {
                fillOpacity: 0.1,
                radius: 8,
            },
        },
    });
    graph.data(data);
    graph.render();

    if (typeof window !== "undefined")
        window.onresize = () => {
            console.log('resize');
            if (!graph || graph.get("destroyed")) {
                console.log('graph', graph);
                return;
            }
            // if (!container || !container.scrollWidth || !container.scrollHeight)
            //     return;
            console.log(container.scrollWidth, container.scrollHeight);
            graph.changeSize(container.scrollWidth, container.scrollHeight);
        };
}
</script>
<style lang="less" module>
.wrap {
  display: flex;
  flex-direction: column;
}
.chart {
  flex: 1 1 auto;
  position: relative;
  background-color: #F5F7FA;
}
.minimap {
  cursor: pointer;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 270px;
  height: 152px;
  background: #fff;
  box-shadow: 0px 16px 28px 3px rgba(0, 0, 0, 0.05),
    0px 8px 33px 7px rgba(0, 0, 0, 0.02), 0px 8px 15px -9px rgba(0, 0, 0, 0.04);
  border-radius: 4px;
}
</style>
