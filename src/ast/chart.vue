<template>
  <div :class="$style.wrap">
    <div>{{ value }}</div>
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
}
type IChainStatus = 'continue' | 'break';
interface MyNodeConfig extends NodeConfig {
    meta: IMeta;
}
type ChartData = {
    nodes: Array<MyNodeConfig>;
    edges: Array<EdgeConfig>;
    combos: Array<ComboConfig>;
    conditionResult: boolean;
};
export default defineComponent({
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
            const edges = parse(props.value, {
                // createParenthesizedExpressions: true,
                tokens: true,
            });
            console.log("ast", edges);
            const firstNode = edges.program.body[0];
            const expression =
        firstNode.type === "ExpressionStatement" ? firstNode.expression : null;
            console.log("edges", props.value, expression);
            return expression;
        });

        function codeToChart(value: string, ast: any) {
            let result: ChartData = { nodes: [], edges: [], combos: [], conditionResult: false };

            const startNode: MyNodeConfig = {
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
            result.nodes.forEach((node) => {
                if (ignoreNodes.includes(node.id)) {return}
                if (node.meta.next.length === 0) {
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
                prevNodes: ChartData['nodes'];
            }
        ) {
            const result: ChartData = { nodes: [], edges: [], combos: [], conditionResult: false };
            if (!expression) return result;

            const prevNodesHasContinue = options.prevNodes?.some(n => n.meta.chain === 'continue');

            if (expression.type === "LogicalExpression") {
                // const parenthesized = expression.left.extra?.parenthesized;
                // console.log('parenthesized', parenthesized)
                const leftData = astToChartEdges(expression.left, {
                    prevNodes: options.prevNodes,
                    parentCombo: options.parentCombo,
                });
                const prevNodes = expression.operator === "&&" ?
                    leftData.nodes.filter(node => {
                        return node.meta.next.length === 0;
                    })
                    : options.prevNodes;
                const rightData = astToChartEdges(expression.right, {
                    prevNodes,
                    parentCombo: options.parentCombo,
                });

                result.edges = result.edges.concat(leftData.edges, rightData.edges);
                result.nodes = result.nodes.concat(leftData.nodes, rightData.nodes);
                result.combos = result.combos.concat(leftData.combos, rightData.combos);

                result.conditionResult = expression.operator === "&&" ? (leftData.conditionResult && rightData.conditionResult) : (leftData.conditionResult || rightData.conditionResult);
            } else if (expression.type === "NumericLiteral") {
                const nodeId = genNodeId(expression.value);
                const conditionResult = Boolean(props.conditions.find(condition => Number(condition.seq) === Number(expression.value))?.result);
                options.prevNodes.forEach(prevNode => {
                    prevNode.meta.next.push(nodeId);

                    result.edges.push({
                        source: prevNode.id,
                        target: nodeId,
                        style: initEdgeStyle(prevNode.meta.chain === 'continue'),
                    });
                })
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
                result.conditionResult = conditionResult;
            } else if (expression.type === 'UnaryExpression' && expression.operator === '!') {
                const comboId = 'combo_' + genId();
                const combo: ChartData['combos'][number] = {
                    id: comboId,
                    parentId: options.parentCombo?.id,
                    style: {
                        fill: '#FFAA00',
                        stroke: '#FFAA00',
                        lineDash: [2],
                    },
                };

                result.combos.push(combo);
                let prevNodes = options.prevNodes;
                if (!options.parentCombo) {
                    const comboInputNode: MyNodeConfig = {
                        type: 'rect',
                        size: 8,
                        id: genNodeId('combo_input[' + comboId + ']'),
                        style: {
                            stroke: '#326BFB'
                        },
                        meta: {
                            next: [],
                            chain: prevNodesHasContinue ? 'continue' : 'break',
                        },
                        // anchorPoints: [
                        //     [0, 0.5],
                        //     [0.5, 0],
                        //     [0.5, 1],
                        // ],
                    }
                    prevNodes = [comboInputNode]
                    result.nodes.push(comboInputNode)
                    options.prevNodes?.forEach(prevNode => {
                        prevNode.meta.next.push(comboInputNode.id)
                        result.edges.push({
                            source: prevNode.id,
                            target: comboInputNode.id,
                            style: initEdgeStyle(prevNode.meta.chain === 'continue'),
                        })
                    })
                }
                const children = astToChartEdges(expression.argument, {
                    parentCombo: combo,
                    prevNodes,
                });
                result.conditionResult = !children.conditionResult;
                result.edges = result.edges.concat(children.edges);
                result.nodes = result.nodes.concat(children.nodes);
                result.combos = result.combos.concat(children.combos);
                if (!options.parentCombo) {
                    const comboOutputNode: MyNodeConfig = {
                        type: 'rect',
                        size: 8,
                        id: genNodeId('combo_output[' + comboId + ']'),
                        style: {
                            stroke: '#326BFB'
                        },
                        meta: {
                            next: [],
                            chain: result.conditionResult ? 'continue' : 'break',
                        },
                        // anchorPoints: [
                        //     [1, 0.5],
                        //     [0.5, 0],
                        //     [0.5, 1],
                        // ],
                    }

                    const isContinue = prevNodesHasContinue && result.conditionResult;
                    children.edges.forEach(edge => {
                        edge.style = initEdgeStyle(isContinue);
                    });

                    children.nodes.forEach(n => {
                        n.meta.chain = isContinue ? 'continue' : 'break';
                        if (n.meta.next.length === 0) {
                            n.meta.next.push(comboOutputNode.id);
                            result.edges.push({
                                source: n.id,
                                target: comboOutputNode.id,
                                style: initEdgeStyle(isContinue),
                            })
                        }
                    });

                    result.nodes.push(comboOutputNode)
                }
            } else {
                return result;
            }

            return result;
        }

        const $style = useCssModule();
        const chartData = computed(() => {
            const data = codeToChart(props.value, ast.value);
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
        endArrow: {
            path: G6.Arrow.triangle(6, 6, 0),
            // path: "M 0,0 L 8,4 L 8,-4 Z",
            fill: color,
        },
        stroke: color,
        lineWidth: conditionResult ? 2 : 1.5,
        radius: 6,
    }
}

function initChart(data: ChartData, $styles: Record<string, string>) {
    const container = document.getElementById("chart1")!;
    // const width = container.scrollWidth;
    // const height = container.scrollHeight || 500;

    const toolbar = new G6.ToolBar({
        className: $styles.toolbar,
    });
    const minimap = new G6.Minimap({
        className: $styles.minimap,
        type: "delegate",
    });
    const graph = new G6.Graph({
        container: container,
        // width,
        // height,
        // fitView: true,
        // fitCenter: true,
        groupByTypes: false,
        modes: {
            default: [
                "drag-canvas",
                // "drag-node",
                "zoom-canvas",
                "click-select",
                // 'drag-combo',
            ],
        },
        plugins: [minimap, toolbar],
        layout: {
            type: "dagre",
            rankdir: "LR",
            // align: "UL",
            controlPoints: true,
            // sortByCombo: true,
            // nodesepFunc: () => 16,
            ranksepFunc(node: NodeConfig) {
                if (/^combo_input|combo_output/.test(node.id)) {
                    return 0;
                }
                return 16;
            },
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
                shadowOffsetX: 0,
                shadowOffsetY: 2,
                shadowBlur: 4,
                shadowColor: 'rgba(12, 18, 31, 0.06)',
            },
        },
        nodeStateStyles: {
            // click 状态为 true 时的样式
            click: {
                stroke: '#326BFB',
                lineWidth: 1.5,
                shadowColor: '#326BFB'
            },
            // hover 状态为 true 时的样式
            hover: {
                cursor: 'pointer',
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

    graph.on('node:mouseenter', (e) => {
        const nodeItem = e.item;
        // 设置目标节点的 hover 状态 为 true
        nodeItem && graph.setItemState(nodeItem, 'hover', true);
    });
    // 监听鼠标离开节点
    graph.on('node:mouseleave', (e) => {
        const nodeItem = e.item;
        // 设置目标节点的 hover 状态 false
        nodeItem && graph.setItemState(nodeItem, 'hover', false);
    });

    graph.on('node:click', (e) => {
        // 先将所有当前有 click 状态的节点的 click 状态置为 false
        const clickNodes = graph.findAllByState('node', 'click');
        clickNodes.forEach((cn) => {
            graph.setItemState(cn, 'click', false);
        });
        const nodeItem = e.item;
        // 设置目标节点的 click 状态 为 true
        nodeItem && graph.setItemState(nodeItem, 'click', true);
    });
    // graph.on('afterlayout', e => {
    //     const combos = graph.getCombos();
    //     graph.getNodes().forEach(node => {
    //         const nodeId = node.getID();
    //         if (!/^combo_input|combo_output/.test(nodeId)) {
    //             return;
    //         }
    //         const comboId = nodeId.split(/\[|\]/)[1];
    //         const combo = combos.find(c => {
    //             return c.getID() === comboId;
    //         });
    //         if (!combo) {
    //             return;
    //         }
    //         if (/^combo_input/.test(nodeId)) {
    //             graph.updateItem(node, {
    //                 x: combo.getLinkPointByAnchor(0).x - 32,
    //                 y: combo.getLinkPointByAnchor(1).y,
    //             })
    //         }
    //         if (/^combo_output/.test(nodeId)) {
    //             graph.updateItem(node, {
    //                 x: combo.getLinkPointByAnchor(1).x + 32,
    //                 y: combo.getLinkPointByAnchor(1).y,
    //             })
    //         }
    //     });
    // });

    if (typeof window !== "undefined")
        window.onresize = () => {
            console.log('resize');
            if (!graph || graph.get("destroyed")) {
                console.log('graph', graph);
                return;
            }
            console.log(container.scrollWidth, container.scrollHeight);
            graph.changeSize(container.scrollWidth, container.scrollHeight);
        };

    return graph;
}

function genNodeId(expression: number | string) {
    return expression + '_' + genId();
}

function genId() {
    return  String(Math.ceil(Math.random() * 100000000).toString(16)).padEnd(7, '0');
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
  bottom: 24px;
  left: 24px;
  width: 270px;
  height: 152px;
  background: #fff;
  box-shadow: 0px 16px 28px 3px rgba(0, 0, 0, 0.05),
    0px 8px 33px 7px rgba(0, 0, 0, 0.02), 0px 8px 15px -9px rgba(0, 0, 0, 0.04);
  border-radius: 4px;
}
.toolbar {
    position: absolute;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    row-gap: 16px;
    list-style: none;
    margin: 0;
    padding: 0;
    > li {
        border: 1px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: #fff;
        box-shadow: 0px 16px 28px 3px rgba(0, 0, 0, 0.05), 0px 8px 33px 7px rgba(0, 0, 0, 0.02), 0px 8px 15px -9px rgba(0, 0, 0, 0.04);
        border-radius: 4px;
        cursor: pointer;
        &:hover {
            border-color: #326BFB;
        }
    }
    :global {
        [code="redo"], [code="undo"] {
            display: none;
        }
    }
}
</style>
