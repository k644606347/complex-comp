<template>
    <div>
        <div id="chart1" style="height: 100%"></div>
        <div>{{ ast }}{{ chartData }}</div>
    </div>
</template>
<script lang="ts">
import { computed, defineComponent, nextTick, onMounted } from "vue";
import { parse } from "@babel/parser";
import { Expression } from '@babel/types/lib/index';
import traverse from '@babel/traverse';
import G6 from "@antv/g6";

type ChartData = {
    nodes: Array<{
        id: string;
        label: string;
    }>;
    edges: Array<{
        source: string;
        target: string;
    }>;
};
export default defineComponent({
    props: {
        code: { type: String, default: "1 && 2 && 3 && 3.1 && ((4 && 4.1 || (5 && 5.1)) || 6)" },
    },
    name: "ChartDemo",
    setup(props) {
        const ast = computed(() => {
            const result = parse(props.code, {
                // createParenthesizedExpressions: true,
                tokens: true,
            });
            console.log("ast", result);
            const firstNode = result.program.body[0];
            const expression =
                firstNode.type === "ExpressionStatement"
                    ? firstNode.expression
                    : null;
            console.log(
                "result",
                props.code,
                expression,
                // JSON.stringify(expression, null, 4)
            );
            traverse(result, {
                enter(path) {
                    const blackList = ['Program', 'ExpressionStatement']
                    if (!blackList.includes(path.type)) {
                        console.log(path.node, path.node.type, (path.node as any).value, (path.node as any).extra?.parenthesized ? '()' : undefined);
                    }
                },
            });
            return expression;
        });

        function astToChartData(expression?: Expression, prevValue: string | number) {
            const result: ChartData['edges'] = [];
            if (!expression) return;

            if (expression.type === 'LogicalExpression') {
                // result.push(...astToChartData(expression));
                if (expression.left.type === 'NumericLiteral') {
                    // result.push({

                    // })
                }
            }
        }

        const chartData = computed(() => {
            const data: ChartData = { nodes: [], edges: []};
            return data;
        });

        onMounted(async () => {
            await nextTick()
            initChart(chartData.value);
        })

        return {
            ast,
            chartData,
        };
    },
});

function initChart(data: ChartData) {
    data = {
        nodes: [
            {
                id: "0",
                label: "0",
            },
            {
                id: "1",
                label: "1",
            },
            {
                id: "2",
                label: "2",
            },
            {
                id: "3",
                label: "3",
            },
            {
                id: "4",
                label: "4",
            },
            {
                id: "5",
                label: "5",
            },
            {
                id: "6",
                label: "6",
            },
            {
                id: "7",
                label: "7",
            },
            {
                id: "7.1",
                label: "7.1",
            },
            {
                id: "8",
                label: "8",
            },
            {
                id: "9",
                label: "9",
            },
        ],
        edges: [
            {
                source: "0",
                target: "1",
            },
            {
                source: "0",
                target: "2",
            },
            {
                source: "1",
                target: "4",
            },
            {
                source: "3",
                target: "4",
            },
            {
                source: "4",
                target: "5",
            },
            {
                source: "4",
                target: "6",
            },
            {
                source: "5",
                target: "7",
            },
            {
                source: "5",
                target: "7.1",
            },
            {
                source: "5",
                target: "8",
            },
            {
                source: "8",
                target: "9",
            },
            {
                source: "2",
                target: "9",
            },
            {
                source: "3",
                target: "9",
            },
            {
                source: "0",
                target: "3",
            },
        ],
    };

    const container = document.getElementById("chart1")!;
    const width = container.scrollWidth;
    const height = container.scrollHeight || 500;
    const graph = new G6.Graph({
        container: container,
        width,
        height,
        fitView: true,
        fitCenter: true,
        modes: {
            default: ["drag-canvas", "drag-node"],
        },
        layout: {
            type: "dagre",
            rankdir: "LR",
            align: "UL",
            // controlPoints: true,
            nodesepFunc: () => 1,
            ranksepFunc: () => 1,
        },
        defaultNode: {
            size: [30, 20],
            type: "rect",
            style: {
                lineWidth: 2,
                stroke: "#5B8FF9",
                fill: "#C6E5FF",
            },
            stateStyles: {
                hover: {
                    fill: '#d3adf7',
                }
            }
        },
        defaultEdge: {
            type: "polyline",
            size: 1,
            // color: "#e2e2e2",
            style: {
                endArrow: {
                    path: "M 0,0 L 8,4 L 8,-4 Z",
                    fill: "#e2e2e2",
                },
                radius: 20,
            },
            // stateStyles: {
            //     hover: {
            //         fill: '#d3adf7',
            //     },
            //     'node-label': {
            //         fontSize: 15
            //     },
            // }
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
