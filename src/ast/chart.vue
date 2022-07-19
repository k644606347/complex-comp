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
type IMeta = {
    next: string[];
    seq?: number;
    chain: IChainStatus;
    nodeType?: 'node' | 'combo';
}
type IChainStatus = 'continue' | 'break';
type ChartData = {
    nodes: Array<NodeConfig & {
        meta: IMeta;
    }>;
    edges: Array<EdgeConfig>;
    combos: Array<ComboConfig & {
        meta: IMeta;
    }>;
    conditionResult: boolean;
};
export default defineComponent({
    props: {
        code: {
            type: String,
            // default: "3 && 1 && (2 || 3) && !(!4 && 5 || !!(!6 && !3)) || 7 && 8 && !9 && 10 && (11 || 12) && !(13 && 14 || !15)",
            // default: "3 || 1 && 2 || 3 && 3 && !((4 && 5 || !(5 && !6)) || 7) || !(8 || 9 || 10)",
            // default: '1 && !(2 || 3 || 4) && !(5 && 6) || (7 || !(4 && 8 || !(!2 || !10)))'
            default: '1 && !(2 || 3) && 5'
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
            let result: ChartData = { nodes: [], edges: [], combos: [], conditionResult: false };

            const startNode: ChartData['nodes'][number] = {
                id: "start",
                label: "开始",
                meta: {
                    next: [],
                    chain: 'continue',
                },
                linkPoints: {
                    right: true,
                },
            };
            result = astToChartEdges(ast, {
                prevNodes: [startNode]
            });
            result.nodes.push(startNode);
            result.nodes.push({
                id: "end",
                label: "结束",
                meta: {
                    next: [],
                    chain: 'continue',
                },
            });
            
            const ignoreNodes = ['start', 'end'];
            [...result.nodes, ...result.combos].forEach((node) => {
                if (ignoreNodes.includes(node.id)) {return}
                if (node.meta.next.length === 0 && !node.parentId) {
                    node.meta.next = ["end"];
                    result.edges.push({
                        source: node.id,
                        target: "end",
                        style: initEdgeStyle(node.meta.chain === 'continue'),
                    });
                }
            });
            return result;
        }

        function astToChartEdges(
            expression: Expression,
            options: {
                parentCombo?: ChartData['combos'][number];
                rootCombo?: ChartData['combos'][number];
                prevNodes?: ChartData['nodes'] | ChartData['combos'];
            }
        ) {
            const result: ChartData = { nodes: [], edges: [], combos: [], conditionResult: false };
            if (!expression) return result;

            const prevNodesHasContinue = options.prevNodes?.some(n => n.meta.chain === 'continue');

            console.log('expr', expression)
            if (expression.type === "LogicalExpression") {
                // const parenthesized = expression.left.extra?.parenthesized;
                // console.log('parenthesized', parenthesized)
                const leftData = astToChartEdges(expression.left, {
                    prevNodes: options.prevNodes,
                    parentCombo: options.parentCombo,
                    rootCombo: options.rootCombo,
                });
                result.edges = result.edges.concat(leftData.edges);
                result.nodes = result.nodes.concat(leftData.nodes);
                result.combos = result.combos.concat(leftData.combos);
                const prevNodes = expression.operator === "&&"
                    ? [...result.nodes, ...result.combos].filter(node => {
                        return !node.parentId && node.meta.next.length === 0;
                    })
                    : options.prevNodes;
                console.log('prevNodes', prevNodes)
                const rightData = astToChartEdges(expression.right, {
                    prevNodes,
                    parentCombo: options.parentCombo,
                    rootCombo: options.rootCombo,
                });
                result.edges = result.edges.concat(rightData.edges);
                result.nodes = result.nodes.concat(rightData.nodes);
                result.combos = result.combos.concat(rightData.combos);
                result.conditionResult = expression.operator === "&&" ? (leftData.conditionResult && rightData.conditionResult) : (leftData.conditionResult || rightData.conditionResult);
            } else if (expression.type === "NumericLiteral") {
                const nodeId = expression.value + '_' + Math.ceil(Math.random() * 100000000).toString(16);
                const conditionResult = props.conditions.find(condition => Number(condition.seq) === Number(expression.value))?.result;
                if (options.prevNodes) {
                    options.prevNodes.forEach(prevNode => {
                        prevNode.meta.next.push(nodeId);
                
                        // console.log('parent', prevNode, props.conditions.find(condition => Number(condition.seq) === Number(prevNode.meta.seq)));
                        // console.log('cur', expression.value, props.conditions.find(condition => Number(condition.seq) === Number(expression.value))?.result)

                        result.edges.push({
                            source: prevNode.id,
                            target: nodeId,
                            style: initEdgeStyle(prevNodesHasContinue),
                            sourceAnchor: 1,
                            type: prevNode.meta.nodeType === 'combo' ? 'line' : 'polyline',
                            targetAnchor: 0
                        });
                    })
                } else if (options.rootCombo) {
                    result.edges.push({
                        source: options.rootCombo.id,
                        target: nodeId,
                        style: initEdgeStyle(prevNodesHasContinue),
                        sourceAnchor: 0,
                        type: 'line',
                        targetAnchor: 0
                    });
                }

                result.nodes.push({
                    comboId: options.parentCombo?.id,
                    id: nodeId,
                    label: "条件" + String(expression.value),
                    meta: {
                        seq: expression.value,
                        next: [],
                        chain: prevNodesHasContinue && conditionResult ? 'continue' : 'break',
                    },
                    labelCfg: {
                        style: {
                            fill: conditionResult ? '#30C453' : '#FA4E3E'
                        }
                    },
                    linkPoints: {
                        right: true,
                    },
                })
                result.conditionResult = Boolean(conditionResult);
            } else if (expression.type === 'UnaryExpression' && expression.operator === '!') {
                const comboId = 'combo_' + Math.ceil(Math.random() * 1000000).toString(16);
                const combo: ChartData['combos'][number] = {
                    id: comboId,
                    parentId: options.parentCombo?.id,
                    style: {
                        fill: '#FFAA00',
                        stroke: '#FFAA00',
                        lineDash: [2],
                    },
                    meta: {
                        next: [],
                        chain: 'break',
                        nodeType: 'combo'
                    }
                };

                result.combos.push(combo);
                options.prevNodes?.forEach(n => {
                    n.meta.next.push(comboId)
                    result.edges.push({
                        source: n.id,
                        target: comboId,
                        style: initEdgeStyle(prevNodesHasContinue),
                        sourceAnchor: 1,
                        targetAnchor: 0
                    });
                });
                const children = astToChartEdges(expression.argument, {
                    parentCombo: combo,
                    rootCombo: options.parentCombo ? options.rootCombo : combo,
                });
                result.conditionResult = !children.conditionResult;
                result.edges = result.edges.concat(children.edges);
                result.nodes = result.nodes.concat(children.nodes);
                result.combos = result.combos.concat(children.combos);
                if (!options.parentCombo) {
                    result.nodes.forEach(n => {
                        if (n.meta.next.length === 0) {
                            n.meta.next.push(comboId);
                            result.edges.push({
                                type: 'line',
                                source: n.id,
                                target: comboId,
                                sourceAnchor: 1,
                                targetAnchor: 1,
                            })
                        }
                    });
                    result.nodes.forEach(n => {
                        n.meta.chain = prevNodesHasContinue && result.conditionResult ? 'continue' : 'break';
                    });
                    result.edges.forEach(edge => {
                        edge.style = initEdgeStyle(prevNodesHasContinue && result.conditionResult);
                    });
                }
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

function initEdgeStyle(conditionResult?: boolean): ShapeStyle {
    const color = conditionResult ? '#326BFB' : '#BBBDBF';
    return {
        // endArrow: true,
        // endArrow: {
        //     path: G6.Arrow.triangle(6, 6, 0),
        //     // path: "M 0,0 L 8,4 L 8,-4 Z",
        //     fill: color,
        // },
        stroke: color,
        lineWidth: 1.5,
        radius: 10,
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
                "drag-node",
                "zoom-canvas",
                "click-select",
                'drag-combo',
            ],
        },
        plugins: [minimap, toolbar],
        layout: {
            type: "dagre",
            rankdir: "LR",
            align: "DL",
            // controlPoints: true,
            // sortByCombo: true,
            nodesepFunc: () => 20,
            ranksepFunc: () => 15,
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
