<template>
    <tr>
        <td>{{ data.key }}</td>
        <td>{{ data.label }}</td>
        <td>{{ data.value }}</td>
        <td><button @click="$emit('appendRow')">appendRow</button></td>
    </tr>
</template>
<script lang="ts">
import { defineComponent, onMounted, onUpdated, PropType } from 'vue'
import { IOption } from '@/utils';

export default defineComponent({
    props: {
        data: { type: Object as PropType<IOption> },
        index: { type: Number },
    },
    name: 'TableItem',
    setup(props) {
        onMounted(() => {
            console.log('mounted', props.data?.key)
        })
        onUpdated(() => {
            console.log('updated', props.data?.key)
        })
        return {};
    },
})
</script>
