# Implementation Plan: Time Off Management

## Overview

This implementation plan breaks down the Time Off Management feature into discrete coding tasks. The feature includes backend models, service layer, controllers, routes, frontend API client, and a three-tab UI component with role-based access control. The implementation follows an incremental approach, building from data layer through business logic to the user interface, with testing integrated throughout.

## Tasks

- [x] 1. Set up backend data models
  - [x] 1.1 Implement TimeoffType model with schema and validations
    - Create `Backend/src/features/timeoff/timeoffType.model.js`
    - Define schema with fields: name, unit, requiresAllocation, requiresApproval, status
    - Add enum constraints for unit (days/hours) and status (active/archived)
    - Set default values per design specification
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.2 Implement Allocation model with schema and computed fields
    - Create `Backend/src/features/timeoff/allocation.model.js`
    - Define schema with fields: employee, timeoffType, totalDays, takenDays, validFrom, validTo, status
    - Add virtual field `remainingDays` computed as totalDays - takenDays
    - Add indexes for employee and timeoffType queries
    - Set min value constraints and defaults per design specification
    - _Requirements: 2.1, 2.2, 2.3, 2.10_
  
  - [x] 1.3 Implement Request model with schema and computed duration
    - Create `Backend/src/features/timeoff/request.model.js`
    - Define schema with fields: employee, timeoffType, startDate, endDate, duration, status, reason, refusalReason, allocation
    - Add enum constraint for status (pending/approved/refused)
    - Add indexes for employee and status queries
    - Set default values per design specification
    - _Requirements: 3.1, 3.2, 3.5_

- [x] 2. Implement service layer business logic
  - [x] 2.1 Implement duration computation function
    - Create `Backend/src/features/timeoff/timeoff.service.js`
    - Implement `computeDuration(startDate, endDate)` function
    - Use formula: Math.round((endDate - startDate) / 86400000) + 1
    - Export function for use in controllers
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 2.2 Write property tests for duration computation
    - **Property 1: Duration is always >= 1 for valid date ranges**
    - **Property 2: Duration from date to (date + n days) equals n + 1**
    - **Property 3: Duration computation is commutative in sign**
    - **Validates: Requirements 3.2, 3.3**
    - Create test file using fast-check library
    - Configure minimum 100 iterations per property
  
  - [x] 2.3 Implement allocation selection algorithm
    - Add `findSuitableAllocation(employeeId, timeoffTypeId, duration)` function to service
    - Query allocations matching employee, timeoffType, status=approved, remainingDays >= duration
    - Filter by validity date ranges (validFrom <= now, validTo >= now)
    - Sort by validTo (null/future preferred), then validFrom (earliest preferred)
    - Return first matching allocation or null
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 2.4 Write property tests for allocation selection
    - **Property 4: Returns allocation with remainingDays >= duration**
    - **Property 5: Prefers allocations with validTo = null**
    - **Property 6: Selects earliest validFrom among candidates**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Create test file with generated mock allocation data
    - Use fast-check generators for test data

- [ ] 3. Implement controller layer handlers
  - [x] 3.1 Implement Time Off Type controllers
    - Modify `Backend/src/features/timeoff/timeoff.controller.js`
    - Implement `getTimeoffTypes(req, res)` with status query filter
    - Implement `createTimeoffType(req, res)` with validation
    - Implement `updateTimeoffType(req, res)` with validation
    - Use ApiResponse and ApiError wrappers
    - Use asyncHandler for error handling
    - _Requirements: 1.5, 1.6, 1.7, 1.8_
  
  - [x] 3.2 Implement Allocation controllers with role-based data scoping
    - Add `getAllocations(req, res)` to controller
    - Implement employee-specific filtering for employees (req.user.employee)
    - Implement query parameter filtering for approvers
    - Add computed remainingDays field to response
    - Implement `createAllocation(req, res)` with validation
    - Validate referenced employee and timeoffType exist
    - Set status to "approved" for approver-created allocations
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_
  
  - [x] 3.3 Implement Request creation controller
    - Add `createRequest(req, res)` to controller
    - Compute duration using service layer function
    - Validate endDate >= startDate
    - Set status to "pending"
    - For employees: auto-set employee field to req.user.employee
    - For approvers: require employee field in request body
    - Validate referenced timeoffType exists
    - _Requirements: 3.4, 3.6, 3.7, 3.8, 3.9_
  
  - [x] 3.4 Implement Request retrieval controller with role-based filtering
    - Add `getRequests(req, res)` to controller
    - Implement employee-specific filtering for employees
    - Return all requests for approvers
    - Support status query parameter filtering
    - Populate employee name and timeoffType name fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 3.5 Implement Request approval controller with balance deduction
    - Add `approveRequest(req, res)` to controller
    - Validate request status is "pending"
    - Load associated TimeoffType
    - If requiresAllocation is false: set status to "approved" without allocation changes
    - If requiresAllocation is true: call findSuitableAllocation service function
    - If no suitable allocation found: return 400 error "Insufficient leave balance"
    - If allocation found: increment takenDays, set request allocation link, set status to "approved"
    - Save both allocation and request atomically
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [x] 3.6 Implement Request refusal controller
    - Add `refuseRequest(req, res)` to controller
    - Validate request status is "pending"
    - Accept optional refusalReason from request body
    - Set status to "refused"
    - Store refusalReason if provided
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 3.7 Write unit tests for controller layer
    - Test each controller function with mocked models and services
    - Verify role-based data scoping (employee vs approver)
    - Test error scenarios (invalid input, missing records, insufficient permissions)
    - Test balance deduction logic in approval controller

- [x] 4. Set up routes and middleware
  - [x] 4.1 Configure Time Off API routes
    - Modify `Backend/src/features/timeoff/timeoff.routes.js`
    - Add GET /types with requireAuth middleware
    - Add POST /types with requireAuth and requireRole("admin", "hr_manager")
    - Add PUT /types/:id with requireAuth and requireRole("admin", "hr_manager")
    - Add GET /allocations with requireAuth
    - Add POST /allocations with requireAuth and requireRole("admin", "hr_manager")
    - Add GET /requests with requireAuth
    - Add POST /requests with requireAuth
    - Add POST /requests/:id/approve with requireAuth and requireRole("admin", "hr_manager")
    - Add POST /requests/:id/refuse with requireAuth and requireRole("admin", "hr_manager")
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 4.2 Mount time-off router in main application
    - Modify `Backend/src/app.js`
    - Import timeoff router
    - Mount at /api/timeoff prefix
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 5. Checkpoint - Verify backend implementation
  - Ensure all tests pass, ask the user if questions arise.
  - Test API endpoints manually using a tool like Postman or curl
  - Verify role-based access control works correctly
  - Verify balance deduction logic in approval flow

- [x] 6. Implement frontend API client
  - [x] 6.1 Create timeoffApi module with Time Off Type functions
    - Create `Frontend/src/features/timeoff/timeoffApi.js`
    - Implement `getTimeoffTypes(filters = {})` using apiRequest wrapper
    - Implement `createTimeoffType(input)` using apiRequest wrapper
    - Implement `updateTimeoffType(id, input)` using apiRequest wrapper
    - Use URLSearchParams for query parameters
    - _Requirements: 15.1, 15.4, 15.5_
  
  - [x] 6.2 Add Allocation API functions
    - Add `getAllocations(filters = {})` to timeoffApi module
    - Add `createAllocation(input)` to timeoffApi module
    - Use URLSearchParams for employee filtering
    - _Requirements: 15.2, 15.4, 15.5_
  
  - [x] 6.3 Add Request API functions
    - Add `getRequests(filters = {})` to timeoffApi module
    - Add `createRequest(input)` to timeoffApi module
    - Add `approveRequest(id)` to timeoffApi module
    - Add `refuseRequest(id, reason)` to timeoffApi module
    - Support reason parameter in refuseRequest
    - _Requirements: 15.3, 15.4, 15.5, 15.6_
  
  - [ ]* 6.4 Write unit tests for API client
    - Test function signatures and parameter handling
    - Test query parameter formatting
    - Test request body serialization
    - Mock apiRequest wrapper for isolated testing

- [-] 7. Implement Time Off Types tab UI
  - [ ] 7.1 Create TypesTab component structure
    - Modify `Frontend/src/features/timeoff/TimeoffPage.jsx`
    - Add state for active tab selection (default: "requests")
    - Add tab navigation buttons (Requests, Allocations, Time Off Types)
    - Create TypesTab component (can be inline or separate file)
    - Fetch time-off types on mount using getTimeoffTypes
    - Display loading and error states
    - _Requirements: 12.1, 12.3_
  
  - [ ] 7.2 Implement Time Off Types table display
    - Create table with columns: Name, Unit, Requires allocation, Requires approval, Status
    - Render time-off type records from API response
    - Format boolean values as "Yes"/"No" or checkmarks
    - _Requirements: 12.2_
  
  - [ ] 7.3 Add Time Off Type creation form for approvers
    - Check user role using useAuth hook
    - Display "New type" form only for admin/hr_manager roles
    - Add form fields: name input, unit select, requiresAllocation checkbox, requiresApproval checkbox, status select
    - Handle form submission with createTimeoffType API call
    - Re-fetch types after successful creation
    - Display success/error messages
    - _Requirements: 12.4, 12.5_
  
  - [ ] 7.4 Add Time Off Type edit form for approvers
    - Display edit button/form only for admin/hr_manager roles
    - Pre-populate form with selected type data
    - Handle form submission with updateTimeoffType API call
    - Re-fetch types after successful update
    - _Requirements: 12.5_

- [ ] 8. Implement Allocations tab UI
  - [ ] 8.1 Create AllocationsTab component structure
    - Add AllocationsTab component to TimeoffPage
    - Fetch allocations on mount using getAllocations
    - Display loading and error states
    - Implement role-based filtering (employees see only their own)
    - _Requirements: 13.1, 13.3, 13.4_
  
  - [ ] 8.2 Implement Allocations table display
    - Create table with columns: Employee, Type, Total, Taken, Remaining, Valid from, Valid to
    - Render allocation records from API response
    - Display computed remainingDays field
    - Format dates for display (validFrom, validTo)
    - Show "N/A" for null validity dates
    - _Requirements: 13.2_
  
  - [ ] 8.3 Add Allocation creation form for approvers
    - Display "New allocation" form only for admin/hr_manager roles
    - Add form fields: employee selector, type selector, totalDays input, validFrom date, validTo date
    - Fetch employees and types for dropdown options
    - Handle form submission with createAllocation API call
    - Re-fetch allocations after successful creation
    - Display success/error messages
    - _Requirements: 13.5_

- [ ] 9. Implement Requests tab UI
  - [ ] 9.1 Create RequestsTab component structure
    - Add RequestsTab component to TimeoffPage
    - Fetch requests on mount using getRequests
    - Display loading and error states
    - Implement role-based filtering (employees see only their own)
    - _Requirements: 14.1, 14.3, 14.5_
  
  - [ ] 9.2 Implement Requests table display with actions
    - Create table with columns: Employee, Type, Dates, Duration, Status
    - Render request records from API response
    - Format date range (startDate - endDate)
    - Display status with color coding (pending/approved/refused)
    - Show refusalReason if present for refused requests
    - _Requirements: 14.2_
  
  - [ ] 9.3 Add Request creation form for employees
    - Display "Request time off" form for all users
    - Add form fields: type select (dropdown), date range picker (startDate, endDate), reason textarea
    - Fetch time-off types for dropdown options
    - Handle form submission with createRequest API call
    - Re-fetch requests after successful creation
    - Display success/error messages
    - _Requirements: 14.4_
  
  - [ ] 9.4 Add approval/refusal actions for approvers
    - Display Approve and Refuse buttons on pending requests for admin/hr_manager roles
    - Handle Approve button click with approveRequest API call
    - Display Refuse modal with optional reason textarea on Refuse button click
    - Handle modal submit with refuseRequest API call
    - Re-fetch requests after successful approval/refusal
    - Display success/error messages (including "Insufficient leave balance")
    - _Requirements: 14.6, 14.7_

- [ ] 10. Final integration and wiring
  - [ ] 10.1 Update SmartButtonsBar with Time Off count
    - SmartButtonsBar already has placeholder code for time-off
    - Verify the API call uses correct endpoint format (/timeoff/requests)
    - Update if needed to call getRequests from timeoffApi module
    - Verify count display works correctly
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ] 10.2 Add URL query parameter support for employee filtering
    - Parse "employee" query parameter from URL in TimeoffPage
    - Pass employee filter to API calls when present
    - Allow approvers to view employee-specific requests/allocations via URL
    - _Requirements: 16.2_
  
  - [ ] 10.3 Verify role-based UI rendering
    - Test employee view shows only own data and limited forms
    - Test approver view shows all data and management forms
    - Test form visibility based on role (employee vs admin/hr_manager)
    - Verify action buttons (approve/refuse) only visible to approvers
  
  - [ ]* 10.4 Write integration tests for user workflows
    - Test employee submits request and sees it in requests table
    - Test approver approves request and sees status update
    - Test HR manager creates allocation and sees it in allocations table
    - Test balance deduction after request approval
    - Test refusal with reason

- [ ] 11. Final checkpoint - Complete feature verification
  - Ensure all tests pass, ask the user if questions arise.
  - Test complete end-to-end workflows (type creation → allocation → request → approval)
  - Verify balance tracking accuracy
  - Verify role-based access control throughout the feature
  - Test error handling for insufficient balance scenarios
  - Verify date validation and duration computation

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements from the requirements document for traceability
- Checkpoints (tasks 5 and 11) ensure incremental validation throughout implementation
- Property-based tests validate universal correctness properties of business logic
- Unit tests and integration tests validate specific examples and edge cases
- The implementation follows existing patterns in the codebase (attendance, employees features)
- Role-based access control is enforced at both backend (middleware) and frontend (conditional rendering) layers
