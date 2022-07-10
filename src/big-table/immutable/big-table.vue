<template>
    <div :class="$style.wrap">
        <div :class="$style.title">Immutable data total: {{ dataRef.length }}</div>
        <table border="1" :class="$style.table">
            <tr>
                <td>key</td>
                <td>label</td>
                <td>value</td>
                <td>operation</td>
            </tr>
            <TableItem
                v-for="(item, index) in dataRef"
                :data="item"
                :key="item.key"
                @appendRow="appendRow(index)"
            >
            </TableItem>
        </table>
    </div>
</template>
<script lang="ts">
import { defineComponent, ref } from "vue";
import { initKey, IOption } from "../../utils";
import tableItemVue from "./table-item.vue";

export default defineComponent({
    name: "BigTable",
    components: {
        TableItem: tableItemVue,
    },
    setup() {
        const tableData: IOption[] = [];
        for (let index = 0; index < 5000; index++) {
            tableData.push(Object.freeze({
                key: initKey(),
                label: "label" + index,
                value: "value" + index,
            }));
        }

        const dataRef = ref(Object.freeze(tableData));
        // tableData[0].label = '11111111';
        (window as any)._dataRef = dataRef;
        function initRow(initialData: Partial<IOption>): IOption {
            return {
                key: initKey(),
                label: "",
                value: "",
                ...initialData,
            };
        }

        return {
            dataRef,
            appendRow(index: number) {
                const newData = [...dataRef.value];
                newData.splice(
                    index,
                    0,
                    Object.freeze(initRow({
                        label: `label${index + 1}`,
                        value: `value${index + 1}`,
                    }))
                );
                dataRef.value = Object.freeze(newData);
            },
        };
    },
})
</script>
<style lang="less" module>
.wrap {
    display: flex;
    flex-direction: column;
}
.title {
    font-weight: bold;
    font-size: 24px;
}
.table {
    width: 100%;
    th {
        font-weight: bold;
    }
}
</style>
