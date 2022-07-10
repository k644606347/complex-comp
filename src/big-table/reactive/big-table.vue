<template>
    <div :class="$style.wrap">
        <div :class="$style.title">Reactive Data total: {{ dataRef.length }}</div>
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
        const dataRef = ref<IOption[]>([]);
        for (let index = 0; index < 5000; index++) {
            dataRef.value.push({
                key: initKey(),
                label: "label" + index,
                value: "value" + index,
            });
        }

        function initRow(initialData: Partial<IOption>): IOption {
            return {
                key: initKey(),
                label: "",
                value: "",
                ...initialData,
            };
        }

        (window as any)._dataRef = dataRef;

        return {
            dataRef,
            appendRow(index: number) {
                dataRef.value.splice(
                    index,
                    0,
                    initRow({
                        label: `label${index + 1}`,
                        value: `value${index + 1}`,
                    })
                );
            },
        };
    },
});
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
