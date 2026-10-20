import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'
import PublicEventListView from '../views/public/PublicEventListView.vue'
import PublicEventDetailView from '../views/public/PublicEventDetailView.vue'

export const publicRoutes: RouteRecordRaw[] = [
  {
    path: '/events',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'public-events',
        component: PublicEventListView,
        meta: { public: true },
      },
      {
        path: ':id',
        name: 'public-event-detail',
        component: PublicEventDetailView,
        meta: { public: true },
      },
    ],
  },
]
