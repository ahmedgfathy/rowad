import { createRouter, createWebHistory } from 'vue-router'

import LoginPage from '../pages/LoginPage.vue'
import DashboardPage from '../pages/DashboardPage.vue'
import PropertiesPage from '../pages/PropertiesPage.vue'
import UsersPage from '../pages/UsersPage.vue'
import SettingsPage from '../pages/SettingsPage.vue'

import { supabase } from '../lib/supabase'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },

    {
      path: '/login',
      component: LoginPage,
    },

    {
      path: '/dashboard',
      component: DashboardPage,
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: '/properties',
      component: PropertiesPage,
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: '/users',
      component: UsersPage,
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: '/settings',
      component: SettingsPage,
      meta: {
        requiresAuth: true,
      },
    },

    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach(async (to) => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const isAuthenticated = !!session

  if (to.meta.requiresAuth && !isAuthenticated) {
    return '/login'
  }

  if (to.path === '/login' && isAuthenticated) {
    return '/dashboard'
  }

  return true
})

export default router