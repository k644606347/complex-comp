import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import BigTable1 from '../big-table/reactive/big-table.vue'
import BigTable2 from '../big-table/immutable/big-table.vue'
import AstDemo from '../ast/ast.vue';
import ChartDemo from '../ast/chart.vue';

export const routes: Array<RouteConfig> = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/big-table/reactive',
    name: 'BigTable1',
    component: BigTable1
  },
  {
    path: '/big-table/immutable',
    name: 'BigTable2',
    component: BigTable2
  },
  {
    path: '/ast',
    name: 'AstDemo',
    component: AstDemo
  },
  {
    path: '/chart',
    name: 'ChartDemo',
    component: ChartDemo
  },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
