<template>
  <div class="min-h-screen">
    <div class="container">
      <div class="left-side">
        <div class="brand">
          <h1>Rowad CRM</h1>
          <p>
            Real Estate Management Platform
          </p>
        </div>

        <div class="feature">
          <h2>Manage Properties Smarter</h2>
          <p>
            Track properties, clients, leads, and team activity from a
            single dashboard.
          </p>
        </div>
      </div>

      <div class="right-side">
        <div class="login-card">
          <div class="header">
            <h3>Welcome Back</h3>
            <p>Sign in to your account</p>
          </div>

          <form @submit.prevent="login">
            <div class="field">
              <label>Email Address</label>
              <input
                v-model="email"
                type="email"
                placeholder="name@example.com"
              />
            </div>

            <div class="field">
              <label>Password</label>
              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
              />
            </div>

            <button type="submit">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const password = ref('')

const login = () => {
  console.log(email.value, password.value)
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.min-h-screen {
  min-height: 100vh;
  background: #0f172a;
}

.container {
  display: grid;
  grid-template-columns: 1fr 500px;
  min-height: 100vh;
}

.left-side {
  padding: 80px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(circle at top left,#3b82f6,#0f172a 50%);
}

.brand h1 {
  font-size: 42px;
  margin: 0;
  font-weight: 800;
}

.brand p {
  opacity: .8;
  margin-top: 12px;
}

.feature {
  max-width: 500px;
}

.feature h2 {
  font-size: 48px;
  line-height: 1.1;
  margin-bottom: 20px;
}

.feature p {
  font-size: 18px;
  opacity: .85;
}

.right-side {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.login-card {
  width: 100%;
  max-width: 380px;
}

.header h3 {
  margin: 0;
  font-size: 32px;
  color: #111827;
}

.header p {
  color: #6b7280;
  margin-top: 10px;
  margin-bottom: 30px;
}

.field {
  margin-bottom: 18px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-weight: 600;
}

.field input {
  width: 100%;
  padding: 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  outline: none;
  transition: .2s;
}

.field input:focus {
  border-color: #2563eb;
}

button {
  width: 100%;
  border: 0;
  padding: 15px;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  opacity: .95;
}

@media (max-width: 900px) {
  .container {
    grid-template-columns: 1fr;
  }

  .left-side {
    display: none;
  }
}
</style>