<script setup lang="ts">
import { ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Password from 'primevue/password'
import SelectButton from 'primevue/selectbutton'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import Message from 'primevue/message'
import type { EISConfig } from '@/types/eis'

const props = defineProps<{
  config: EISConfig | null
  isTesting?: boolean
}>()

const emit = defineEmits<{
  save: [config: Record<string, unknown>]
  test: []
}>()

const form = ref({
  tin: '',
  branch_code: '',
  api_key: '',
  api_secret: '',
  environment: 'test' as 'test' | 'production',
  batch_size: 100,
  submission_interval_mins: 5,
  is_enabled: false
})

const envOptions = [
  { label: 'Test', value: 'test' },
  { label: 'Production', value: 'production' }
]

watch(
  () => props.config,
  (cfg) => {
    if (cfg) {
      form.value = {
        tin: cfg.tin || '',
        branch_code: cfg.branch_code || '',
        api_key: cfg.api_key || '',
        api_secret: cfg.api_secret || '',
        environment: cfg.environment || 'test',
        batch_size: cfg.batch_size || 100,
        submission_interval_mins: cfg.submission_interval_mins || 5,
        is_enabled: cfg.is_enabled === 1
      }
    }
  },
  { immediate: true }
)

function handleSave() {
  emit('save', {
    tin: form.value.tin,
    branch_code: form.value.branch_code,
    api_key: form.value.api_key,
    api_secret: form.value.api_secret,
    environment: form.value.environment,
    batch_size: form.value.batch_size,
    submission_interval_mins: form.value.submission_interval_mins,
    is_enabled: form.value.is_enabled ? 1 : 0
  })
}

function handleTest() {
  emit('test')
}
</script>

<template>
  <div class="eis-config-form">
    <Message v-if="form.environment === 'production'" severity="warn" class="mb-4">
      Production mode will submit real data to BIR. Ensure all credentials are correct.
    </Message>

    <div class="form-grid">
      <div class="form-group">
        <label>TIN <span class="required">*</span></label>
        <InputText v-model="form.tin" placeholder="123-456-789-000" class="w-full" />
      </div>

      <div class="form-group">
        <label>Branch Code <span class="required">*</span></label>
        <InputText v-model="form.branch_code" placeholder="0001" class="w-full" />
      </div>

      <div class="form-group">
        <label>API Key <span class="required">*</span></label>
        <Password v-model="form.api_key" :feedback="false" toggleMask class="w-full" inputClass="w-full" />
      </div>

      <div class="form-group">
        <label>API Secret <span class="required">*</span></label>
        <Password v-model="form.api_secret" :feedback="false" toggleMask class="w-full" inputClass="w-full" />
      </div>
    </div>

    <div class="form-group mt-4">
      <label>Environment</label>
      <SelectButton v-model="form.environment" :options="envOptions" optionLabel="label" optionValue="value" />
    </div>

    <div class="form-grid mt-4">
      <div class="form-group">
        <label>Batch Size</label>
        <InputNumber v-model="form.batch_size" :min="10" :max="500" class="w-full" />
        <small>Submissions per batch (10-500)</small>
      </div>

      <div class="form-group">
        <label>Submission Interval (minutes)</label>
        <InputNumber v-model="form.submission_interval_mins" :min="1" :max="60" class="w-full" />
        <small>How often to process pending submissions</small>
      </div>
    </div>

    <div class="toggle-item mt-4">
      <div class="toggle-info">
        <label>Enable EIS Submission</label>
        <small>When enabled, all new transactions will be queued for BIR submission</small>
      </div>
      <ToggleSwitch v-model="form.is_enabled" />
    </div>

    <div class="action-buttons mt-4">
      <Button
        label="Test Connection"
        icon="pi pi-wifi"
        severity="secondary"
        :loading="isTesting"
        @click="handleTest"
        :disabled="!form.api_key || !form.api_secret"
      />
      <Button
        label="Save Configuration"
        icon="pi pi-save"
        @click="handleSave"
        :disabled="!form.tin || !form.branch_code"
      />
    </div>
  </div>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-group small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;
}

.required {
  color: var(--p-red-500);
}

.toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
}

.toggle-info label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
}

.toggle-info small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
}
</style>
