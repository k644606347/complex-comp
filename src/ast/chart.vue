<template>
  <div :class="$style.wrap">
    <div>{{ code }}</div>
    <div id="chart1" :class="$style.chart"></div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, useCssModule } from "vue";
import { parse } from "@babel/parser";
import { Expression } from "@babel/types/lib/index";
import traverse from "@babel/traverse";
import G6 from "@antv/g6";
import { uniq } from "lodash";

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
    code: { type: String, default: "1 && 2 || 3 && 3.1 && ((4 && 4.1 || (5 && 5.1)) || 6)" },
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
      console.log(
        "edges",
        props.code,
        expression
        // JSON.stringify(expression, null, 4)
      );
      // traverse(edges, {
      //     enter(path) {
      //         const blackList = ['Program', 'ExpressionStatement']
      //         if (!blackList.includes(path.type)) {
      //             console.log(path.node, path.node.type, (path.node as any).value, (path.node as any).extra?.parenthesized ? '()' : undefined);
      //         }
      //     },
      // });
      return expression;
    });

    function codeToChart(code: string, ast: any) {
      const result: ChartData = { nodes: [], edges: [] };

      result.nodes = [
        { id: "start", label: "start" },
        ...uniq(code.match(/\d+(\.\d+)?/g) ?? []).map((item) => ({
          id: String(item),
          label: '条件' + String(item),
        })),
      ];
      result.edges = astToChartEdges(ast, "start");
      return result;
    }

    function astToChartEdges(
      expression: Expression,
      prevValue: string | number
    ) {
      let edges: ChartData["edges"] = [];
      if (!expression) return edges;

      if (expression.type === "LogicalExpression") {
        edges = edges.concat(astToChartEdges(expression.left, prevValue));
        const lastEdge = edges[edges.length - 1];
        edges = edges.concat(
          astToChartEdges(
            expression.right,
            expression.operator === "&&" ? lastEdge.target : prevValue
          )
        );
      } else if (expression.type === "NumericLiteral") {
        edges.push({
          source: String(prevValue),
          target: String(expression.value),
        });
      } else {
        return edges;
      }

      return edges;
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
    type: 'delegate',
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
        "zoom-canvas", "click-select"
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
    box-shadow: 0px 16px 28px 3px rgba(0, 0, 0, 0.05), 0px 8px 33px 7px rgba(0, 0, 0, 0.02), 0px 8px 15px -9px rgba(0, 0, 0, 0.04);
    border-radius: 4px;
}
</style>
