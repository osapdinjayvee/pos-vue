# Tasks: User Management

**Input**: Design documents from `/specs/003-user-management/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api.yaml, quickstart.md

**Tests**: Tests included where specified in quickstart.md verification steps.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema, types, and project structure for user management feature

- [x] T001 Create database migration for user management tables in src/db/migrations/004_user_management.ts
- [x] T002 [P] Create TypeScript type definitions in src/types/user.ts
- [x] T003 [P] Create crypto utility for PIN hashing in src/utils/crypto.ts
- [x] T004 [P] Create input validators for user data in src/utils/validators.ts
- [x] T005 Seed default roles and permissions in src/db/seeders/roles.ts
- [x] T006 Seed default admin user for development in src/db/seeders/users.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core repositories and services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create user repository in src/repositories/userRepository.ts
- [x] T008 [P] Create role repository in src/repositories/roleRepository.ts
- [x] T009 [P] Create permission repository in src/repositories/permissionRepository.ts (included in roleRepository.ts)
- [x] T010 Create auth log repository in src/repositories/authLogRepository.ts
- [x] T011 Create shift repository in src/repositories/shiftRepository.ts
- [x] T012 Create auth service with login/logout logic in src/services/authService.ts
- [x] T013 Create cached credentials service for offline auth in src/services/cachedCredentialsService.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Authentication (Priority: P1) 🎯 MVP

**Goal**: Users can log in with username and PIN, with offline support via cached credentials

**Independent Test**: Log in with valid credentials and verify access to POS interface; test offline auth with cached credentials

### Implementation for User Story 1

- [x] T014 [P] [US1] Create PinPad.vue component in src/components/auth/PinPad.vue
- [x] T015 [P] [US1] Create LoginForm.vue component in src/components/auth/LoginForm.vue
- [x] T016 [US1] Create auth store with login/logout state in src/stores/auth.ts
- [x] T017 [US1] Create useAuth composable in src/composables/useAuth.ts
- [x] T018 [US1] Implement PIN verification in authService.ts with bcrypt comparison
- [x] T019 [US1] Implement offline authentication using cached credentials
- [x] T020 [US1] Create LockScreen.vue component in src/components/auth/LockScreen.vue
- [x] T021 [US1] Implement auto-lock timer on inactivity (5 minutes configurable)
- [x] T022 [US1] Add auth event logging (login success/failure) to authLogRepository
- [x] T023 [US1] Create LoginView.vue page in src/views/LoginView.vue
- [x] T024 [US1] Add login route and auth guard in src/router/index.ts

**Checkpoint**: User Story 1 complete - users can authenticate with username/PIN ✅

---

## Phase 4: User Story 2 - Role-Based Access Control (Priority: P1)

**Goal**: Users have different permission levels; cashiers cannot access admin functions

**Independent Test**: Log in as cashier and verify admin functions are not accessible; verify supervisor prompt for void

### Implementation for User Story 2

- [x] T025 [P] [US2] Create permission checker utility in src/utils/permissions.ts
- [x] T026 [US2] Create usePermissions composable in src/composables/usePermissions.ts
- [x] T027 [US2] Add role-based menu filtering in src/components/layout/AppMenu.vue
- [x] T028 [US2] Create SupervisorAuthDialog.vue for elevated actions in src/components/auth/SupervisorAuthDialog.vue
- [x] T029 [US2] Implement supervisor PIN verification for sensitive actions (void, refund)
- [x] T030 [US2] Add permission checks to existing POS actions (void, refund, discount)
- [x] T031 [US2] Update auth store with user permissions array

**Checkpoint**: User Story 2 complete - role-based access control enforced ✅

---

## Phase 5: User Story 3 - Shift Management (Priority: P1)

**Goal**: Track cashier shifts with opening/closing cash for accountability

**Independent Test**: Start shift, process sales, close shift with variance calculation, view shift report

### Implementation for User Story 3

- [x] T032 [P] [US3] Create ShiftDialog.vue for start/end shift in src/components/auth/ShiftDialog.vue
- [x] T033 [P] [US3] Create ShiftSummary.vue component in src/components/auth/ShiftSummary.vue
- [x] T034 [US3] Create shift store in src/stores/shift.ts
- [x] T035 [US3] Create useShift composable in src/composables/useShift.ts
- [x] T036 [US3] Implement shift start with opening cash recording
- [x] T037 [US3] Implement shift close with variance calculation (expected vs actual)
- [x] T038 [US3] Prevent duplicate open shifts per user
- [x] T039 [US3] Block logout if shift is open (require shift close first)
- [x] T040 [US3] Create shift report generation in shiftRepository.ts
- [x] T041 [US3] Add shift status indicator to app header/topbar
- [ ] T042 [US3] Integrate shift with transaction processing (link transactions to shift)

**Checkpoint**: User Story 3 complete - shift management with cash accountability ✅

---

## Phase 6: User Story 4 - User CRUD Operations (Priority: P2)

**Goal**: Admins can create, edit, and deactivate user accounts

**Independent Test**: Create new cashier user and verify they can log in with assigned credentials

### Implementation for User Story 4

- [x] T043 [P] [US4] Create UserList.vue component in src/components/users/UserList.vue
- [x] T044 [P] [US4] Create UserForm.vue component in src/components/users/UserForm.vue
- [x] T045 [US4] Create user store in src/stores/user.ts
- [x] T046 [US4] Create useUsers composable in src/composables/useUsers.ts
- [x] T047 [US4] Implement user creation with PIN hashing
- [x] T048 [US4] Implement user update with role assignment
- [x] T049 [US4] Implement user deactivation (soft delete)
- [x] T050 [US4] Implement user reactivation
- [x] T051 [US4] Prevent self-deactivation if only admin
- [x] T052 [US4] Create UsersView.vue page in src/views/UsersView.vue
- [x] T053 [US4] Add users route with admin permission check

**Checkpoint**: User Story 4 complete - admin can manage user accounts ✅

---

## Phase 7: User Story 5 - Permission Customization (Priority: P3)

**Goal**: Admins can create custom roles with specific permissions

**Independent Test**: Create "Lead Cashier" role with specific permissions and verify access

### Implementation for User Story 5

- [x] T054 [P] [US5] Create RoleList.vue component in src/components/users/RoleList.vue
- [x] T055 [P] [US5] Create RoleForm.vue component in src/components/users/RoleForm.vue
- [x] T056 [P] [US5] Create PermissionPicker.vue component in src/components/users/PermissionPicker.vue
- [x] T057 [US5] Implement role CRUD operations in roleRepository.ts
- [x] T058 [US5] Add role permission editing with category grouping
- [x] T059 [US5] Update user assignment to support multiple roles
- [x] T060 [US5] Create RolesView.vue page in src/views/RolesView.vue
- [x] T061 [US5] Add roles route with admin permission check

**Checkpoint**: User Story 5 complete - custom roles with fine-grained permissions ✅

---

## Phase 8: Sync & Cross-Cutting Concerns

**Purpose**: Data sync, offline support, and improvements affecting multiple user stories

- [ ] T062 [P] Create sync service for user data in src/services/syncService.ts
- [ ] T063 Implement user sync (server → terminal) for offline operation
- [ ] T064 Implement shift/auth log sync (terminal → server)
- [x] T065 Add credential cache expiry handling (7-day limit)
- [x] T066 [P] Add loading states and error handling across auth components
- [x] T067 [P] Add form validation messages for all user forms
- [x] T068 Ensure login completes under 2 seconds (SC-001)
- [x] T069 Add auth event logging with 100% capture rate (SC-008)
- [ ] T070 Run quickstart.md verification scenarios
- [ ] T071 Code cleanup and component refactoring

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3) should complete before P2/P3 stories
  - US2 depends on US1 (auth must work before permissions)
  - US3 can run parallel to US2 after US1 completes
  - US4 and US5 can proceed in parallel after P1 completion
- **Sync (Phase 8)**: Depends on at least US1-US3 being complete

### User Story Dependencies

- **US1 (Authentication)**: Core functionality - no dependencies on other stories
- **US2 (RBAC)**: Depends on US1 for authenticated user context
- **US3 (Shifts)**: Depends on US1 for user login; can run parallel to US2
- **US4 (User CRUD)**: Depends on US1, US2 for admin access; extends US1
- **US5 (Custom Roles)**: Depends on US2 for role system; extends US4

### Within Each User Story

- Components marked [P] can run in parallel
- Repositories before services
- Services before composables
- Composables before store integration
- Store before view integration
- Commit after each task or logical group

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- Foundational: T008, T009 can run parallel
- US1: T014, T015 (components) can run parallel
- US2: T025 can run parallel with other components
- US3: T032, T033 can run parallel
- US4: T043, T044 can run parallel
- US5: T054, T055, T056 can run parallel
- Sync: T062, T066, T067 can run parallel

---

## Parallel Example: User Story 1

```bash
# Launch components in parallel:
Task: "Create PinPad.vue component in src/components/auth/PinPad.vue"
Task: "Create LoginForm.vue component in src/components/auth/LoginForm.vue"

# Then sequentially:
Task: "Create auth store with login/logout state in src/stores/auth.ts"
Task: "Create useAuth composable in src/composables/useAuth.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Authentication (US1)
4. **STOP and VALIDATE**: Test login flow independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Auth) → Test → Login works (MVP!)
3. Add US2 (RBAC) → Test → Permissions enforced
4. Add US3 (Shifts) → Test → Cash accountability (Production Ready!)
5. Add US4 (User CRUD) → Test → Admin can manage users
6. Add US5 (Custom Roles) → Test → Fine-grained permissions
7. Add Sync → Test → Offline-first complete

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Auth)
3. After US1:
   - Developer A: User Story 2 (RBAC)
   - Developer B: User Story 3 (Shifts)
4. After US2:
   - Developer A: User Story 4 (User CRUD)
   - Developer B: User Story 5 (Custom Roles)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- PIN is 4-6 digit numeric code hashed with bcrypt
- Offline credentials cache expires after 7 days
- Shift must be closed before logout (accountability)
- Users cannot be deleted, only deactivated (data integrity)
- Auto-lock defaults to 5 minutes but is configurable
- Commit after each task or logical group
- Verify component renders before moving to next task
