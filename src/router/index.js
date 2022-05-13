import Vue from 'vue'
import VueRouter from 'vue-router'
import store from "@/store";
import HomeView from '../views/HomeView.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/login',
    name: 'Login',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/LoginView.vue')
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

router.beforeEach(async (to, from, next) => {
  console.log("working?", to)
  if (to.query.access_code) {
    // If the route contains an access code, exchange it
    try {
      await store.dispatch("exchangeAccessCode", to.query.access_code);
    } catch (err) {
      console.warn("exchange failed", err);
    }
    // Whatever happens, go home.
    next("/");
  } else {
    if (to.name !== "Login") {
      // if the user is going to a page that isn't the login page, check that they're logged in
      try {
        console.log("in here")
        const res = await store.dispatch("getUser");
        console.log("res:", res);
        next();
        console.log("got down here")
      } catch (err) {
        console.log("redirecting");
        // redirect to login page if the user is not signed in
        next("/login");
        return;
        // console.log("here? for some reason")
        // if (err.message === "NOT_SIGNED_IN") next("/login");
        // else next("/");
      }
    }
  }
  console.log("got here");
  next();
});

export default router
