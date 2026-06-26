<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { authService, type RecoveryOptions } from '@/services/authService'

const props = defineProps<{
  visible: boolean
  prefillUsername?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  recovered: [username: string]
}>()

type Stage = 'username' | 'choose' | 'questions' | 'supervisor'

const stage = ref<Stage>('username')
const loading = ref(false)
const errorMsg = ref<string | null>(null)

const username = ref('')
const options = ref<RecoveryOptions | null>(null)

// Security-question answers
const answer1 = ref('')
const answer2 = ref('')

// Supervisor/admin override
const authUsername = ref('')
const authPin = ref('')

// New PIN
const newPin = ref('')
const confirmPin = ref('')

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

const newPinValid = computed(
  () => /^\d{4,6}$/.test(newPin.value) && newPin.value === confirmPin.value
)

const newPinError = computed(() => {
  if (!newPin.value) return null
  if (!/^\d{4,6}$/.test(newPin.value)) return 'New PIN must be 4-6 digits.'
  if (confirmPin.value && newPin.value !== confirmPin.value) return 'PINs do not match.'
  return null
})

const canSubmitQuestions = computed(
  () => answer1.value.trim().length > 0 && answer2.value.trim().length > 0 && newPinValid.value
)

const canSubmitSupervisor = computed(
  () =>
    authUsername.value.trim().length > 0 &&
    authPin.value.length >= 4 &&
    newPinValid.value
)

function resetState() {
  stage.value = 'username'
  loading.value = false
  errorMsg.value = null
  username.value = props.prefillUsername || ''
  options.value = null
  answer1.value = ''
  answer2.value = ''
  authUsername.value = ''
  authPin.value = ''
  newPin.value = ''
  confirmPin.value = ''
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) resetState()
  }
)

function close() {
  dialogVisible.value = false
}

async function lookupUsername() {
  if (username.value.trim().length < 3) return
  loading.value = true
  errorMsg.value = null
  try {
    const opts = await authService.getRecoveryOptions(username.value)
    if (!opts.found) {
      errorMsg.value = 'No active account was found with that username.'
      return
    }
    options.value = opts
    stage.value = 'choose'
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Something went wrong.'
  } finally {
    loading.value = false
  }
}

function chooseMethod(method: 'questions' | 'supervisor') {
  errorMsg.value = null
  newPin.value = ''
  confirmPin.value = ''
  stage.value = method
}

function backToChoose() {
  errorMsg.value = null
  stage.value = 'choose'
}

async function submitQuestions() {
  if (!canSubmitQuestions.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const res = await authService.recoverPinViaSecurityAnswers(
      username.value,
      answer1.value,
      answer2.value,
      newPin.value
    )
    if (res.success) {
      emit('recovered', username.value.trim().toLowerCase())
      close()
    } else {
      errorMsg.value = res.error || 'Recovery failed.'
    }
  } finally {
    loading.value = false
  }
}

async function submitSupervisor() {
  if (!canSubmitSupervisor.value) return
  loading.value = true
  errorMsg.value = null
  try {
    const res = await authService.recoverPinViaAuthorizer(
      username.value,
      authUsername.value,
      authPin.value,
      newPin.value
    )
    if (res.success) {
      emit('recovered', username.value.trim().toLowerCase())
      close()
    } else {
      errorMsg.value = res.error || 'Recovery failed.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Forgot PIN"
    modal
    :closable="!loading"
    :close-on-escape="!loading"
    :style="{ width: '440px', maxWidth: '95vw' }"
  >
    <div class="flex flex-col gap-4">
      <Message v-if="errorMsg" severity="error" :closable="false" icon="pi pi-times-circle">
        {{ errorMsg }}
      </Message>

      <!-- Stage 1: enter username -->
      <template v-if="stage === 'username'">
        <p class="text-sm text-surface-500">
          Enter the username of the account you need to recover.
        </p>
        <div class="flex flex-col gap-1.5">
          <label for="fp-username" class="text-sm font-semibold text-surface-700">Username</label>
          <InputText
            id="fp-username"
            v-model="username"
            placeholder="Enter username"
            :disabled="loading"
            class="w-full"
            @keydown.enter="lookupUsername"
          />
        </div>
        <Button
          label="Continue"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :loading="loading"
          :disabled="username.trim().length < 3"
          @click="lookupUsername"
        />
      </template>

      <!-- Stage 2: choose recovery method -->
      <template v-else-if="stage === 'choose'">
        <p class="text-sm text-surface-500">
          Choose how to verify your identity for <strong>{{ options?.username }}</strong>.
        </p>
        <Button
          v-if="options?.hasSecurityQuestions"
          label="Answer security questions"
          icon="pi pi-question-circle"
          outlined
          class="justify-start"
          @click="chooseMethod('questions')"
        />
        <Message v-else severity="warn" :closable="false" icon="pi pi-info-circle">
          No security questions are set for this account. A supervisor or admin can reset it.
        </Message>
        <Button
          label="Reset with supervisor / admin"
          icon="pi pi-shield"
          outlined
          class="justify-start"
          @click="chooseMethod('supervisor')"
        />
        <Button label="Back" text size="small" icon="pi pi-arrow-left" @click="stage = 'username'" />
      </template>

      <!-- Stage 3a: security questions -->
      <template v-else-if="stage === 'questions'">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-surface-700">{{ options?.question1 }}</label>
          <InputText v-model="answer1" placeholder="Your answer" :disabled="loading" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-surface-700">{{ options?.question2 }}</label>
          <InputText v-model="answer2" placeholder="Your answer" :disabled="loading" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-surface-700">New PIN</label>
            <Password v-model="newPin" :feedback="false" toggle-mask :disabled="loading" placeholder="4-6 digits" input-class="w-full" class="w-full" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-surface-700">Confirm PIN</label>
            <Password v-model="confirmPin" :feedback="false" toggle-mask :disabled="loading" placeholder="Re-enter" input-class="w-full" class="w-full" />
          </div>
        </div>
        <small v-if="newPinError" class="text-red-500">{{ newPinError }}</small>

        <div class="flex justify-between">
          <Button label="Back" text icon="pi pi-arrow-left" :disabled="loading" @click="backToChoose" />
          <Button label="Reset PIN" icon="pi pi-check" :loading="loading" :disabled="!canSubmitQuestions" @click="submitQuestions" />
        </div>
      </template>

      <!-- Stage 3b: supervisor / admin override -->
      <template v-else-if="stage === 'supervisor'">
        <p class="text-sm text-surface-500">
          A supervisor or admin enters their own credentials to authorize resetting
          <strong>{{ options?.username }}</strong>.
        </p>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-surface-700">Supervisor / admin username</label>
          <InputText v-model="authUsername" placeholder="Authorizer username" :disabled="loading" class="w-full" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-semibold text-surface-700">Authorizer PIN</label>
          <Password v-model="authPin" :feedback="false" toggle-mask :disabled="loading" placeholder="Their PIN" input-class="w-full" class="w-full" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-surface-700">New PIN</label>
            <Password v-model="newPin" :feedback="false" toggle-mask :disabled="loading" placeholder="4-6 digits" input-class="w-full" class="w-full" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-semibold text-surface-700">Confirm PIN</label>
            <Password v-model="confirmPin" :feedback="false" toggle-mask :disabled="loading" placeholder="Re-enter" input-class="w-full" class="w-full" />
          </div>
        </div>
        <small v-if="newPinError" class="text-red-500">{{ newPinError }}</small>

        <div class="flex justify-between">
          <Button label="Back" text icon="pi pi-arrow-left" :disabled="loading" @click="backToChoose" />
          <Button label="Reset PIN" icon="pi pi-check" :loading="loading" :disabled="!canSubmitSupervisor" @click="submitSupervisor" />
        </div>
      </template>
    </div>
  </Dialog>
</template>
