import G6, { EdgeConfig, NodeConfig, ComboConfig, ShapeStyle } from '@antv/g6';
import { Expression } from "@babel/types/lib/index";
import { inject } from 'vue';

export type IEmit = 'click' | 'select' | 'unselect' | 'hover';
export const emits: IEmit[] = ['click', 'select', 'unselect', 'hover'];

export type IConditionChartContext = {
    ast: Readonly<Expression | null>;
    chartData: Readonly<IChartData>;
    dispatch(e: IEmit, ...args: any[]): void;
    wrapEl?: HTMLElement;
}
export const contextKey = 'rcp_condition_chart_context';
export function useContext() {
    return inject<IConditionChartContext | null>(contextKey, null);
}

export type ICondition = {
    seq: number;
    result: boolean;
    value: string;
}
export type IMeta = {
    next: string[];
    seq?: number;
    chain: IChainStatus;
}
export type IChainStatus = 'continue' | 'break';

export interface MyNodeConfig extends NodeConfig {
    meta: IMeta;
}
export type IChartData = {
    nodes: Array<MyNodeConfig>;
    edges: Array<EdgeConfig>;
    combos: Array<ComboConfig>;
    conditionResult: boolean;
    conditionHtml: string;
};

export function initChartData(): IChartData {
    return { nodes: [], edges: [], combos: [], conditionResult: false, conditionHtml: '' };
}

export function initEdgeStyle(conditionResult?: boolean): ShapeStyle {
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

export function astToChartData(ast: Expression, conditions: ICondition[]): IChartData {
    let result: IChartData = { nodes: [], edges: [], combos: [], conditionResult: false, conditionHtml: '' };

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

    result = _recursition(ast, { prevNodes: [startNode] });

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

    function _recursition(
        expression: Expression,
        options: {
            parentCombo?: IChartData['combos'][number];
            prevNodes: IChartData['nodes'];
        }
    ) {
        const result: IChartData = { nodes: [], edges: [], combos: [], conditionResult: false, conditionHtml: '' };
        if (!expression) return result;

        const prevNodesHasContinue = options.prevNodes?.some(n => n.meta.chain === 'continue');

        if (expression.type === "LogicalExpression") {
            const parenthesized = expression.extra?.parenthesized;
            const leftData = _recursition(expression.left, {
                prevNodes: options.prevNodes,
                parentCombo: options.parentCombo,
            });
            const prevNodes = expression.operator === "&&" ?
                leftData.nodes.filter(node => {
                    return node.meta.next.length === 0;
                })
                : options.prevNodes;
            const rightData = _recursition(expression.right, {
                prevNodes,
                parentCombo: options.parentCombo,
            });

            result.edges = result.edges.concat(leftData.edges, rightData.edges);
            result.nodes = result.nodes.concat(leftData.nodes, rightData.nodes);
            result.combos = result.combos.concat(leftData.combos, rightData.combos);

            result.conditionResult = expression.operator === "&&" ? (leftData.conditionResult && rightData.conditionResult) : (leftData.conditionResult || rightData.conditionResult);
            result.conditionHtml = leftData.conditionHtml + '<span>' + expression.operator + '</span>' + rightData.conditionHtml;
            if (parenthesized) {
                result.conditionHtml = `<span>(${result.conditionHtml})</span>`
            }
        } else if (expression.type === "NumericLiteral") {
            const nodeId = genNodeId(expression.value);
            const conditionResult = Boolean(conditions.find(condition => Number(condition.seq) === Number(expression.value))?.result);
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
            result.conditionResult = conditionResult
            result.conditionHtml = `<span class="rcp-condition-chart-item" data-item-id="${nodeId}" data-item-type="node">${expression.value}</span>`
        } else if (expression.type === 'UnaryExpression' && expression.operator === '!') {
            const comboId = 'combo_' + genId();
            const combo: IChartData['combos'][number] = {
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
            const children = _recursition(expression.argument, {
                parentCombo: combo,
                prevNodes,
            });
            result.conditionResult = !children.conditionResult;
            result.conditionHtml = `<span class="rcp-condition-chart-item" data-item-id="${comboId}" data-item-type="combo">!${children.conditionHtml}</span>`;
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

    return result;   
}

function genNodeId(expression: number | string) {
    return expression + '_' + genId();
}

function genId() {
    return  String(Math.ceil(Math.random() * 100000000).toString(16)).padEnd(7, '0');
}