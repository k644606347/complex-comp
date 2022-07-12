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
    useCssModule,
} from "vue";
import { parse } from "@babel/parser";
import { Expression } from "@babel/types/lib/index";
import G6 from "@antv/g6";

type ChartData = {
    nodes: Array<{
        id: string;
        label: string;
        next?: string[];
    }>;
    edges: Array<{
        source: string;
        target: string;
    }>;
};
export default defineComponent({
    props: {
        code: {
            type: String,
            default: "0 || 1 && 2 || 3 && 3 && ((4 && 5 || (5 && 6)) || 7) || 5 && 3",
        },
    // code: { type: String, default: "1 || 2 || 3 && 4 || 5" },
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
            let result: ChartData = { nodes: [], edges: [] };

            const startNode = {
                id: "start",
                label: "开始",
            };
            result = astToChartEdges(ast, startNode);
            result.nodes.push(startNode);
            result.nodes.push({
                id: "end",
                label: "结束",
            });
            result.nodes.forEach((node) => {
                if (!node.next) {
                    node.next = ["end"];
                    result.edges.push({
                        source: node.id,
                        target: "end",
                    });
                }
            });
            return result;
        }

        function astToChartEdges(
            expression: Expression,
            parentNode: ChartData["nodes"][number]
        ) {
            const result: ChartData = { nodes: [], edges: [] };
            if (!expression) return result;

            if (expression.type === "LogicalExpression") {
                const leftData = astToChartEdges(expression.left, parentNode);
                result.edges = result.edges.concat(leftData.edges);
                result.nodes = result.nodes.concat(leftData.nodes);
                const lastEdge = result.edges[result.edges.length - 1];

                const rightData = astToChartEdges(
                    expression.right,
                    expression.operator === "&&"
                        ? result.nodes.find((n) => n.id === lastEdge.target)!
                        : parentNode
                );
                result.edges = result.edges.concat(rightData.edges);
                result.nodes = result.nodes.concat(rightData.nodes);
            } else if (expression.type === "NumericLiteral") {
                const nodeId =
          new Date() +
          "_" +
          Math.ceil(Math.random() * 1000000).toString(16) +
          "";
                if (!parentNode.next) {
                    parentNode.next = [];
                }
                parentNode.next.push(nodeId);
                result.edges.push({
                    source: parentNode.id,
                    target: nodeId,
                });
                result.nodes.push({
                    id: nodeId,
                    label: "条件" + String(expression.value),
                });
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

function initChart(data: ChartData, $styles: Record<string, string>) {
    const container = document.getElementById("chart1")!;
    const width = container.scrollWidth;
    const height = container.scrollHeight || 500;

    const minimap = new G6.Minimap({
        size: [100, 100],
        className: $styles.minimap,
        type: "delegate",
    });
    const graph = new G6.Graph({
        container: container,
        width,
        height,
        fitView: true,
        fitCenter: true,
        modes: {
            default: [
                "drag-canvas",
                // "drag-node",
                "zoom-canvas",
                "click-select",
            ],
        },
        plugins: [minimap],
        layout: {
            type: "dagre",
            rankdir: "LR",
            align: "UL",
            // controlPoints: true,
            nodesepFunc: () => 1,
            ranksepFunc: () => 1,
        },
        defaultNode: {
            size: [50, 20],
            type: "rect",
            style: {
                lineWidth: 2,
                stroke: "#5B8FF9",
                fill: "#C6E5FF",
            },
            stateStyles: {
                hover: {
                    fill: "#d3adf7",
                },
            },
        },
        defaultEdge: {
            type: "polyline",
            size: 1,
            style: {
                endArrow: {
                    path: "M 0,0 L 8,4 L 8,-4 Z",
                    fill: "#e2e2e2",
                },
                radius: 20,
            },
        },
    });
    graph.data(data);
    graph.render();

    if (typeof window !== "undefined")
        window.onresize = () => {
            if (!graph || graph.get("destroyed")) return;
            if (!container || !container.scrollWidth || !container.scrollHeight)
                return;
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
