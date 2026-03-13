<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import LoginForm from '@/components/auth/LoginForm.vue'
import { useAuth } from '@/composables/useAuth'
import logoImg from '@/assets/img/logo.png'
import logoWhiteImg from '@/assets/img/logo-white.png'

const router = useRouter()
const toast = useToast()
const { login, isAuthenticated, initializeAuth } = useAuth()

const appName = import.meta.env.VITE_APP_NAME || 'Zoomin POS'
const appVersion = __APP_VERSION__

const isLoading = ref(false)
const terminalId = ref('POS-001')

async function handleLogin(credentials: {
  username: string
  pin: string
  terminalId: string
}) {
  isLoading.value = true

  try {
    const result = await login(credentials)

    if (!result.success) {
      toast.add({
        severity: 'error',
        summary: 'Login Failed',
        detail: result.error || 'Invalid username or PIN',
        life: 4000
      })
    }
    // Navigation handled by useAuth.login
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Login Failed',
      detail: err instanceof Error ? err.message : 'An error occurred',
      life: 4000
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  initializeAuth()

  // If already authenticated, redirect
  if (isAuthenticated.value) {
    router.push('/')
  }

  // Get terminal ID from localStorage or environment
  const storedTerminalId = localStorage.getItem('pos_terminal_id')
  if (storedTerminalId) {
    terminalId.value = storedTerminalId
  }
})
</script>

<template>
  <div class="login-view">
    <!-- Left Panel: Branding -->
    <div class="branding-panel">
      <div class="branding-content">
        <div class="logo">
          <img :src="logoWhiteImg" alt="Logo" class="logo-image" />
        </div>
        <h1 class="app-name">{{ appName }}</h1>
        <p class="tagline">Streamline your business operations with our modern point of sale system</p>

        <div class="features">
          <div class="feature-item">
            <i class="pi pi-bolt"></i>
            <span>Fast Checkout</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-chart-bar"></i>
            <span>Real-time Analytics</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-box"></i>
            <span>Inventory Management</span>
          </div>
          <div class="feature-item">
            <i class="pi pi-shield"></i>
            <span>Secure Transactions</span>
          </div>
        </div>
      </div>

      <div class="branding-footer">
        <p>&copy; {{ new Date().getFullYear() }} {{ appName }}</p>
      </div>
    </div>

    <!-- Right Panel: Login Form -->
    <div class="form-panel">
      <div class="form-container">
        <!-- Mobile Logo (hidden on desktop) -->
        <div class="mobile-logo">
          <img :src="logoImg" alt="Logo" class="mobile-logo-image" />
          <h2>{{ appName }}</h2>
        </div>

        <LoginForm
          :loading="isLoading"
          :terminal-id="terminalId"
          @submit="handleLogin"
        />

        <div class="form-footer">
          <p class="version">v{{ appVersion }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
}

/* Branding Panel (Left) */
.branding-panel {
  flex: 0 0 45%;
  background: linear-gradient(
    135deg,
    var(--p-primary-600) 0%,
    var(--p-primary-700) 50%,
    var(--p-primary-800) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem;
  color: white;
  position: relative;
  overflow: hidden;
}

.branding-panel::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  pointer-events: none;
}

.branding-panel::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -30%;
  width: 80%;
  height: 80%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.branding-content {
  position: relative;
  z-index: 1;
  max-width: 400px;
  margin: 0 auto;
}

.branding-panel .logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.app-name {
  margin: 0 0 0.75rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.tagline {
  margin: 0 0 2.5rem 0;
  font-size: 1.125rem;
  line-height: 1.6;
  opacity: 0.9;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  transition: background 0.2s;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.15);
}

.feature-item i {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}

.feature-item span {
  font-size: 0.95rem;
  font-weight: 500;
}

.branding-footer {
  position: absolute;
  bottom: 2rem;
  left: 3rem;
  right: 3rem;
  z-index: 1;
}

.branding-footer p {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Form Panel (Right) */
.form-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-ground);
  padding: 2rem;
}

.form-container {
  width: 100%;
  max-width: 400px;
}

@media (min-width: 1200px) {
  .form-container {
    max-width: 450px;
  }
}

@media (min-width: 1400px) {
  .form-container {
    max-width: 500px;
  }
}

.mobile-logo {
  display: none;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.mobile-logo-image {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin-bottom: 0.75rem;
}

.mobile-logo h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.form-footer {
  text-align: center;
  margin-top: 2rem;
}

.form-footer .version {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

/* Tablet */
@media (max-width: 1024px) {
  .branding-panel {
    flex: 0 0 40%;
    padding: 2rem;
  }

  .branding-footer {
    left: 2rem;
    right: 2rem;
    bottom: 1.5rem;
  }

  .app-name {
    font-size: 2rem;
  }

  .tagline {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .branding-panel .logo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .login-view {
    flex-direction: column;
  }

  .branding-panel {
    display: none;
  }

  .form-panel {
    min-height: 100vh;
    padding: 1.5rem;
  }

  .mobile-logo {
    display: flex;
  }

  .form-container {
    max-width: 400px;
  }
}

/* Small Mobile */
@media (max-width: 400px) {
  .form-panel {
    padding: 1rem;
  }

  .mobile-logo h2 {
    font-size: 1.25rem;
  }

  .mobile-logo-image {
    width: 56px;
    height: 56px;
  }
}
</style>
