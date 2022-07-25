<template>
    <div ref="chartRef" class="rcp-condition-chart"></div>
</template>

<script lang="ts">
import {
    computed, defineComponent,
    nextTick, onMounted, ref, shallowRef, watch,
} from 'vue';
import G6, { Graph, IG6GraphEvent, Item, ITEM_TYPE, NodeConfig } from '@antv/g6';
import { emits, IChartData, ICondition, IEmit, IEvent, IMeta, useContext } from './utils';
import { isNil } from 'lodash';

const canSelectTypes: ITEM_TYPE[] = [ 'node', 'combo' ];

export default defineComponent({
    name: 'RcpConditionChart',
    emits: emits,
    setup(props, { emit }) {
        const context = useContext();
        const chartRef = ref<HTMLElement>();
        const graphRef = shallowRef<Graph | undefined>();

        const chartData = computed(() => {
            return context?.chartData;
        });

        watch(chartData, newData => {
            if (graphRef.value) {
                graphRef.value.changeData(newData);
            }
        });

        onMounted(async () => {
            await nextTick();
            const wrapEl = context?.wrapEl;
            const chartEl = chartRef.value;
            if (!wrapEl || !chartEl || !chartData.value) {
                return;
            }

            const graph = graphRef.value = initChart(chartData.value, { container: chartEl });
            // (window as any)._graph = graph

            graph.on('mouseenter', e => {
                const item = e.item;
                if (!item || !canSelectTypes.includes(item.getType())) {
                    return;
                }
                graph.setItemState(item, 'hover', true);
                emitEvent('hover', item);
            });
            graph.on('mouseleave', e => {
                const item = e.item;
                if (!item || !canSelectTypes.includes(item.getType())) {
                    return;
                }
                graph.setItemState(item, 'hover', false);
            });

            canSelectTypes.forEach(type => {
                graph.on(type + ':click', onItemClick);
            });

            function onItemClick(e: IG6GraphEvent) {
                const item = e.item;
                if (!wrapEl || !item) {
                    return;
                }

                const state = 'selected';

                const activeStyle = 'rcp-condition-chart-item-actived';
                let isSelected = item.hasState(state);
                if (isSelected) {
                    graph.setItemState(item, state, false);
                    wrapEl.querySelector<HTMLElement>(`[data-item-id="${item.getID()}"]`)?.classList.remove(activeStyle);
                } else {
                    graph.findAllByState(item.getType(), state).forEach(item => {
                        graph.setItemState(item, state, false);
                    });
                    graph.setItemState(item, state, true);

                    wrapEl.querySelectorAll<HTMLElement>('[data-item-id]').forEach(el => {
                        const { dataset, classList } = el;

                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        dataset.itemId === item.getID()
                            ? classList.add(activeStyle)
                            : classList.remove(activeStyle);
                    });
                }
                isSelected = !isSelected;

                emitEvent('click', item);
                emitEvent(isSelected ? 'select' : 'unselect', item);
            }

            wrapEl.addEventListener('click', e => {
                const target = e.target as HTMLElement | undefined;
                if (!target || !target.dataset.itemId) {
                    return;
                }

                const itemId = target.dataset.itemId;
                const itemType = target.dataset.itemType as ITEM_TYPE | undefined;

                const state = 'selected';

                wrapEl.querySelectorAll<HTMLElement>('[data-item-id]').forEach(el => {
                    const activeStyle = 'rcp-condition-chart-item-actived';
                    const { dataset, classList } = el;

                    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                    dataset.itemId === itemId
                        ? classList.add(activeStyle)
                        : classList.remove(activeStyle);
                });

                if (itemType) {
                    const clickItems = canSelectTypes.reduce((prev, cur) => {
                        return prev.concat(graph.findAllByState(cur, state));
                    }, [] as Item[]);

                    clickItems.forEach(cn => {
                        graph.setItemState(cn, state, false);
                    });
                }

                const item = graph.findById(itemId);
                if (item) {
                    graph.setItemState(item, state, true);
                    graph.focusItem(item, true, {
                        easing: 'easeCubic',
                        duration: 400,
                    });
                }
            });
        });

        function emitEvent(e: IEmit, item: Item) {
            const meta = item.getModel().meta as IMeta | undefined;
            const seq = meta?.seq;

            let condition: ICondition | undefined;
            if (!isNil(seq)) {
                condition = context?.getConditions().find(condition => condition.seq === seq);
            }

            const eventArgs: IEvent = {
                seq,
                condition,
                itemType: item.getType(),
            };

            emit(e, eventArgs);
            context?.dispatch(e, eventArgs);
        }

        return {
            chartRef,
        };
    },
});

function initChart(data: IChartData,
    { container }: {
        container: HTMLElement
    }) {
    // const width = container.scrollWidth;
    // const height = container.scrollHeight || 500;

    const toolbar = new G6.ToolBar({
        className: 'rcp-condition-chart-toolbar',
    });
    const minimap = new G6.Minimap({
        className: 'rcp-condition-chart-minimap',
        type: 'delegate',
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
                'scroll-canvas',
                'drag-canvas',
                // "drag-node",
                'zoom-canvas',
                // "click-select",
                // 'drag-combo',
            ],
        },
        plugins: [ minimap, toolbar ],
        layout: {
            type: 'dagre',
            rankdir: 'LR',
            // align: "UL",
            controlPoints: true,
            // sortByCombo: true,
            nodesepFunc: () => 25,
            ranksepFunc(node: NodeConfig) {
                if (/^combo_input|combo_output/.test(node.id)) {
                    return 0;
                }
                return 16;
            },
        },
        defaultNode: {
            size: [ 85, 52 ],
            type: 'rect',
            style: {
                fontSize: 14,
                lineWidth: 1,
                stroke: '#F0F2F5',
                fill: '#fff',
                radius: 4,
                shadowOffsetX: 0,
                shadowOffsetY: 2,
                shadowBlur: 4,
                shadowColor: 'rgba(12, 18, 31, 0.06)',
            },
        },
        nodeStateStyles: {
            selected: {
                stroke: '#326BFB',
                lineWidth: 2,
                shadowColor: '#326BFB',
                shadowBlur: 4,
            },
            hover: {
                cursor: 'pointer',
                stroke: '#326BFB',
                lineWidth: 1.5,
            },
        },
        defaultCombo: {
            type: 'rect',
            padding: 16,
            style: {
                fillOpacity: 0.1,
                radius: 8,
                cursor: 'pointer',
            },
        },
        comboStateStyles: {
            selected: {
                stroke: '#326BFB',
                shadowBlur: 1,
            },
            hover: {
                stroke: '#326BFB',
                lineWidth: 1.5,
            },
        },
        defaultEdge: {
            type: 'polyline',
            size: 1,
        },
    });
    graph.data(data);
    graph.render();
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

    // window.onresize = () => {
    //     console.log('resize');
    //     if (graph.get("destroyed")) {
    //         console.log('graph', graph);
    //         return;
    //     }
    //     console.log(container.scrollWidth, container.scrollHeight);
    //     graph.changeSize(container.scrollWidth, container.scrollHeight);
    // };

    return graph;
}
</script>

<style lang="less">
.rcp-condition-chart {
  position: relative;
  background-color: #F5F7FA;
}

.rcp-condition-chart-minimap {
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

.rcp-condition-chart-toolbar {
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
    [code="redo"], [code="undo"] {
        display: none;
    }
}
</style>
