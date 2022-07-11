<template>
    <pre>
        {{ ast }}
    </pre>
</template>
<script lang="ts">
import { computed, defineComponent } from 'vue'
import { parse } from '@babel/parser'

export default defineComponent({
    props: {
        code: { type: String, default: '1 && 2 && 3 && (4 || 5)'},
    },
    name: 'AstDemo',
    setup(props) {
        const ast = computed(() => {
            const result = parse(props.code, { 
                // createParenthesizedExpressions: true,
                tokens: true,
            });
            console.log('ast', result);
            const firstNode = result.program.body[0];
            const expression = firstNode.type === 'ExpressionStatement' ? firstNode.expression : null;
            console.log('result', props.code, expression, JSON.stringify(expression, null, 4));
            return expression;
        });

        return {
            ast
        };
    },
})
</script>
