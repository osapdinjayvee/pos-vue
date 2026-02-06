<script setup lang="ts">
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import { recentOrders } from '@/data/mockData'
import { formatCurrency } from '@/utils/format'

const getStatusSeverity = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'pending':
      return 'warn'
    case 'cancelled':
      return 'danger'
    default:
      return 'info'
  }
}
</script>

<template>
  <div class="table-card">
    <div class="table-card-header">
      <h3 class="table-card-title">Recent Orders</h3>
      <Button label="View All" link size="small" />
    </div>
    <DataTable
      :value="recentOrders"
      :rows="5"
      paginator
      :rowsPerPageOptions="[5, 10, 20]"
      stripedRows
    >
      <Column field="id" header="Order ID" sortable />
      <Column field="customer" header="Customer" sortable />
      <Column field="date" header="Date" sortable />
      <Column field="amount" header="Amount" sortable>
        <template #body="{ data }">
          {{ formatCurrency(data.amount) }}
        </template>
      </Column>
      <Column field="paymentMethod" header="Payment" sortable />
      <Column field="status" header="Status" sortable>
        <template #body="{ data }">
          <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
