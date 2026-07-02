<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import type { DisplayCustomer } from '@/types/order'
import type { MembershipTier } from '@/types/tier'

interface CustomerStats {
  totalOrders: number
  totalSpent: number
  avgTicket: number
  lastVisit: string | null
}

interface Props {
  customer: DisplayCustomer
  tier: MembershipTier | null
  stats: CustomerStats
}

const props = defineProps<Props>()

// ---------------------
// Currency formatting
// ---------------------

function formatCurrency(value: number): string {
  return `\u20B1${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

// ---------------------
// Tier badge severity
// ---------------------

type TagSeverity = 'secondary' | 'info' | 'warn' | 'success' | 'danger' | 'contrast' | undefined

const tierSeverityMap: Record<string, TagSeverity> = {
  Bronze: 'secondary',
  Silver: 'info',
  Gold: 'warn',
  Platinum: 'success'
}

const tierSeverity = computed<TagSeverity>(() => {
  if (!props.tier) return undefined
  return tierSeverityMap[props.tier.name] ?? 'secondary'
})

// ---------------------
// Customer type severity
// ---------------------

const customerTypeSeverityMap: Record<string, TagSeverity> = {
  retail: 'info',
  wholesale: 'warn',
  vip: 'success'
}

const customerTypeSeverity = computed<TagSeverity>(() => {
  return customerTypeSeverityMap[props.customer.customerType] ?? 'info'
})

// ---------------------
// Member since date
// ---------------------

const memberSince = computed(() => {
  if (!props.customer.createdAt) return 'Unknown'
  const date = new Date(props.customer.createdAt)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// ---------------------
// Points PHP equivalent (1 point = 1 PHP by convention)
// ---------------------

const pointsPhpEquivalent = computed(() => {
  return formatCurrency(props.customer.loyaltyPoints)
})

// ---------------------
// Last visit formatted
// ---------------------

const lastVisitFormatted = computed(() => {
  if (!props.stats.lastVisit) return 'Never'
  const date = new Date(props.stats.lastVisit)
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

// ---------------------
// Full address
// ---------------------

const fullAddress = computed(() => {
  const parts: string[] = []
  if (props.customer.address) parts.push(props.customer.address)
  if (props.customer.city) parts.push(props.customer.city)
  if (props.customer.postalCode) parts.push(props.customer.postalCode)
  if (props.customer.country && props.customer.country !== 'PH') parts.push(props.customer.country)
  return parts.join(', ')
})
</script>

<template>
  <div class="customer-profile">
    <!-- Header -->
    <div class="profile-header">
      <div class="header-left">
        <h2 class="customer-name">{{ customer.name }}</h2>
        <div class="header-tags">
          <Tag
            v-if="tier"
            :value="tier.name"
            :severity="tierSeverity"
          />
          <Tag
            :value="customer.isActive ? 'Active' : 'Inactive'"
            :severity="customer.isActive ? 'success' : 'danger'"
          />
        </div>
      </div>
    </div>

    <!-- Contact Info -->
    <div class="contact-row">
      <span v-if="customer.phone" class="contact-item">
        <i class="pi pi-phone"></i>
        {{ customer.phone }}
      </span>
      <span v-if="customer.email" class="contact-item">
        <i class="pi pi-envelope"></i>
        {{ customer.email }}
      </span>
      <span v-if="fullAddress" class="contact-item">
        <i class="pi pi-map-marker"></i>
        {{ fullAddress }}
      </span>
    </div>

    <!-- Account Info -->
    <div class="account-row">
      <div class="account-item">
        <span class="account-label">Member since</span>
        <span class="account-value">{{ memberSince }}</span>
      </div>
      <div class="account-item">
        <span class="account-label">Customer type</span>
        <Tag
          :value="customer.customerTypeLabel"
          :severity="customerTypeSeverity"
        />
      </div>
    </div>

    <!-- Points Balance -->
    <div class="points-section">
      <div class="points-display">
        <span class="points-number">{{ customer.loyaltyPoints.toLocaleString('en-PH') }}</span>
        <span class="points-label">pts</span>
      </div>
      <span class="points-equivalent">{{ pointsPhpEquivalent }} equivalent</span>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-shopping-cart"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.totalOrders.toLocaleString('en-PH') }}</span>
          <span class="stat-label">Total Orders</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-wallet"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ formatCurrency(stats.totalSpent) }}</span>
          <span class="stat-label">Lifetime Spend</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-receipt"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ formatCurrency(stats.avgTicket) }}</span>
          <span class="stat-label">Avg Ticket</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="pi pi-calendar"></i>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ lastVisitFormatted }}</span>
          <span class="stat-label">Last Visit</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-profile {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Header */
.profile-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.customer-name {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.header-tags {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Contact Row */
.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--app-surface-100);
  border-bottom: 1px solid var(--app-surface-100);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.contact-item i {
  font-size: 0.875rem;
  color: var(--p-primary-color);
}

/* Account Row */
.account-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
}

.account-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.account-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--p-text-muted-color);
}

.account-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

/* Points Section */
.points-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: var(--p-primary-50);
  border-radius: 10px;
  text-align: center;
}

.points-display {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.points-number {
  font-size: 2rem;
  font-weight: 800;
  color: var(--p-primary-color);
  line-height: 1;
}

.points-label {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-primary-color);
  opacity: 0.7;
}

.points-equivalent {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: var(--app-surface-50);
  border: 1px solid var(--app-surface-100);
  border-radius: 10px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  background: var(--p-primary-50);
  flex-shrink: 0;
}

.stat-icon i {
  font-size: 1rem;
  color: var(--p-primary-color);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.stat-value {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--p-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  white-space: nowrap;
}

/* Responsive: stack stats into 2 columns on smaller widths */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .contact-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
