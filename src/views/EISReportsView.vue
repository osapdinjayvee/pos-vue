<script setup lang="ts">
import { ref } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import EISSummaryReport from '@/components/eis/EISSummaryReport.vue'
import EISComplianceExport from '@/components/eis/EISComplianceExport.vue'

const activeTab = ref('summary')
</script>

<template>
  <div class="eis-reports-view">
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="summary">
          <i class="pi pi-chart-bar"></i>
          <span>Summary</span>
        </Tab>
        <Tab value="export">
          <i class="pi pi-download"></i>
          <span>Export</span>
        </Tab>
      </TabList>

      <TabPanels>
        <TabPanel value="summary">
          <EISSummaryReport />
        </TabPanel>
        <TabPanel value="export">
          <EISComplianceExport />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
.eis-reports-view {
  padding: 1.5rem;
}
</style>
