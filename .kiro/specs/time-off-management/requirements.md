# Requirements Document

## Introduction

The Time Off Management feature enables employees to request time off, administrators to manage time-off types and allocations, and approvers to review and approve or refuse requests. The system tracks employee time-off balances through allocations, supports different time-off types with configurable policies, and enforces balance constraints when appropriate.

## Glossary

- **System**: The PeoplePay360 Time Off Management feature
- **Employee**: A registered employee in the system with an active account
- **Admin**: A user with the "admin" role
- **HR_Manager**: A user with the "hr_manager" role
- **Approver**: A user with either "admin" or "hr_manager" role
- **Time_Off_Type**: A category of time off (e.g., vacation, sick leave, personal day) with specific configuration
- **Allocation**: A balance record that grants an employee a specific amount of time off for a particular Time_Off_Type
- **Request**: An employee's formal request to take time off for a specific period
- **Balance**: The difference between totalDays and takenDays in an Allocation
- **Duration**: The inclusive count of days between a Request's startDate and endDate

## Requirements

### Requirement 1: Time Off Type Management

**User Story:** As an HR_Manager, I want to configure different types of time off, so that I can model the organization's time-off policies accurately

#### Acceptance Criteria

1. THE System SHALL store Time_Off_Type records with fields: name (String, required), unit (String enum ["days","hours"], default "days"), requiresAllocation (Boolean, default true), requiresApproval (Boolean, default true), status (String enum ["active","archived"], default "active")
2. WHEN a Time_Off_Type is created, THE System SHALL set requiresAllocation to true unless explicitly specified otherwise
3. WHEN a Time_Off_Type is created, THE System SHALL set requiresApproval to true unless explicitly specified otherwise
4. WHEN a Time_Off_Type is created, THE System SHALL set status to "active" unless explicitly specified otherwise
5. THE System SHALL allow Approvers to create Time_Off_Type records
6. THE System SHALL allow Approvers to update Time_Off_Type records
7. THE System SHALL allow authenticated users to retrieve Time_Off_Type records
8. WHEN retrieving Time_Off_Type records, THE System SHALL filter by status query parameter if provided

### Requirement 2: Allocation Management

**User Story:** As an HR_Manager, I want to grant time-off balances to employees, so that they have available time off to request

#### Acceptance Criteria

1. THE System SHALL store Allocation records with fields: employee (ObjectId ref Employee, required), timeoffType (ObjectId ref Time_Off_Type, required), totalDays (Number, required, min 0), takenDays (Number, default 0, min 0), validFrom (Date, default null), validTo (Date, default null), status (String enum ["pending","approved"], default "approved")
2. WHEN an Allocation is created by an Approver, THE System SHALL set status to "approved"
3. WHEN an Allocation is created, THE System SHALL set takenDays to 0 unless explicitly specified otherwise
4. THE System SHALL allow Approvers to create Allocation records
5. WHEN creating an Allocation, THE System SHALL validate that the referenced employee exists
6. WHEN creating an Allocation, THE System SHALL validate that the referenced timeoffType exists
7. THE System SHALL allow authenticated users to retrieve Allocation records
8. WHEN an Employee retrieves Allocation records, THE System SHALL return only Allocations where employee matches the Employee's own employee reference
9. WHEN an Approver retrieves Allocation records, THE System SHALL return Allocations filtered by employee query parameter if provided
10. WHEN returning Allocation records, THE System SHALL compute and include a remainingDays field equal to totalDays minus takenDays

### Requirement 3: Request Creation

**User Story:** As an Employee, I want to submit time-off requests, so that I can formally request time away from work

#### Acceptance Criteria

1. THE System SHALL store Request records with fields: employee (ObjectId ref Employee, required), timeoffType (ObjectId ref Time_Off_Type, required), startDate (Date, required), endDate (Date, required), duration (Number, computed server-side), status (String enum ["pending","approved","refused"], default "pending"), reason (String, default ""), refusalReason (String, default null), allocation (ObjectId ref Allocation, default null)
2. WHEN a Request is created, THE System SHALL compute duration as the inclusive day count between startDate and endDate
3. WHEN computing duration, THE System SHALL use the formula: Math.round((endDate - startDate) / 86400000) + 1
4. IF endDate is before startDate, THEN THE System SHALL return an error with status code 400
5. WHEN a Request is created, THE System SHALL set status to "pending"
6. THE System SHALL allow authenticated users to create Request records
7. WHEN an Employee creates a Request, THE System SHALL set the employee field to the Employee's own employee reference
8. WHEN an Approver creates a Request, THE System SHALL require the employee field in the request body
9. WHEN creating a Request, THE System SHALL validate that the referenced timeoffType exists

### Requirement 4: Request Retrieval

**User Story:** As an Employee, I want to view my time-off requests, so that I can track the status of my time-off submissions

#### Acceptance Criteria

1. THE System SHALL allow authenticated users to retrieve Request records
2. WHEN an Employee retrieves Request records, THE System SHALL return only Requests where employee matches the Employee's own employee reference
3. WHEN an Approver retrieves Request records, THE System SHALL return all Requests
4. WHEN retrieving Request records, THE System SHALL filter by status query parameter if provided
5. WHEN returning Request records, THE System SHALL populate the employee name field
6. WHEN returning Request records, THE System SHALL populate the timeoffType name field

### Requirement 5: Request Approval Without Balance Deduction

**User Story:** As an HR_Manager, I want to approve requests for time-off types that don't require allocations, so that I can handle flexible time-off policies

#### Acceptance Criteria

1. THE System SHALL allow Approvers to approve Request records with status "pending"
2. WHEN approving a Request, THE System SHALL load the associated Time_Off_Type record
3. IF the Time_Off_Type requiresAllocation field is false, THEN THE System SHALL set the Request status to "approved" without modifying any Allocation
4. IF a Request status is not "pending", THEN THE System SHALL return an error with status code 400 when approval is attempted
5. IF a Request does not exist, THEN THE System SHALL return an error with status code 404 when approval is attempted

### Requirement 6: Request Approval With Balance Deduction

**User Story:** As an HR_Manager, I want to approve requests and deduct from employee balances, so that time-off usage is accurately tracked

#### Acceptance Criteria

1. IF the Time_Off_Type requiresAllocation field is true, THEN THE System SHALL search for an approved Allocation where employee matches Request employee and timeoffType matches Request timeoffType and remainingDays is greater than or equal to Request duration
2. WHEN searching for Allocations, THE System SHALL prefer Allocations with validTo in the future or null
3. WHEN searching for Allocations, THE System SHALL prefer Allocations with the earliest validFrom among matching candidates
4. IF no suitable Allocation is found, THEN THE System SHALL return an error with status code 400 and message "Insufficient leave balance"
5. WHEN a suitable Allocation is found, THE System SHALL increment the Allocation takenDays field by the Request duration
6. WHEN a suitable Allocation is found, THE System SHALL set the Request allocation field to the Allocation identifier
7. WHEN a suitable Allocation is found, THE System SHALL set the Request status to "approved"
8. WHEN a suitable Allocation is found, THE System SHALL save both the Allocation and Request records

### Requirement 7: Request Refusal

**User Story:** As an HR_Manager, I want to refuse time-off requests with an optional reason, so that I can communicate denial decisions to employees

#### Acceptance Criteria

1. THE System SHALL allow Approvers to refuse Request records with status "pending"
2. WHEN refusing a Request, THE System SHALL accept an optional refusalReason in the request body
3. WHEN refusing a Request, THE System SHALL set the Request status to "refused"
4. WHEN refusing a Request with a provided refusalReason, THE System SHALL store the refusalReason in the Request record
5. IF a Request status is not "pending", THEN THE System SHALL return an error with status code 400 when refusal is attempted
6. IF a Request does not exist, THEN THE System SHALL return an error with status code 404 when refusal is attempted

### Requirement 8: Access Control for Time Off Types

**User Story:** As an Admin, I want to restrict time-off type management to authorized roles, so that configuration remains under administrative control

#### Acceptance Criteria

1. THE System SHALL require authentication for all Time_Off_Type endpoints
2. THE System SHALL restrict Time_Off_Type creation to Approvers
3. THE System SHALL restrict Time_Off_Type updates to Approvers
4. THE System SHALL allow all authenticated users to retrieve Time_Off_Type records

### Requirement 9: Access Control for Allocations

**User Story:** As an Admin, I want to restrict allocation creation to authorized roles, so that time-off balances are managed securely

#### Acceptance Criteria

1. THE System SHALL require authentication for all Allocation endpoints
2. THE System SHALL restrict Allocation creation to Approvers
3. THE System SHALL allow all authenticated users to retrieve Allocation records with role-based filtering

### Requirement 10: Access Control for Requests

**User Story:** As an Employee, I want secure access to time-off requests, so that my personal time-off data remains private

#### Acceptance Criteria

1. THE System SHALL require authentication for all Request endpoints
2. THE System SHALL allow all authenticated users to create Request records
3. THE System SHALL allow all authenticated users to retrieve Request records with role-based filtering
4. THE System SHALL restrict Request approval to Approvers
5. THE System SHALL restrict Request refusal to Approvers

### Requirement 11: API Routing Integration

**User Story:** As a developer, I want the time-off API routes mounted in the application, so that the feature is accessible via HTTP

#### Acceptance Criteria

1. THE System SHALL expose Time_Off_Type endpoints under the path prefix "/api/timeoff/types"
2. THE System SHALL expose Allocation endpoints under the path prefix "/api/timeoff/allocations"
3. THE System SHALL expose Request endpoints under the path prefix "/api/timeoff/requests"
4. THE System SHALL mount the time-off router at "/api/timeoff" in the main application

### Requirement 12: Frontend Time Off Type Management Interface

**User Story:** As an HR_Manager, I want a user interface to manage time-off types, so that I can configure policies without direct API access

#### Acceptance Criteria

1. THE System SHALL provide a Time Off Types tab in the TimeoffPage component
2. THE System SHALL display Time_Off_Type records in a table with columns: Name, Unit, Requires allocation, Requires approval, Status
3. THE System SHALL allow all authenticated users to view the Time Off Types tab
4. THE System SHALL display a "New type" form only for Approvers in the Time Off Types tab
5. THE System SHALL display an edit form only for Approvers in the Time Off Types tab

### Requirement 13: Frontend Allocation Management Interface

**User Story:** As an HR_Manager, I want a user interface to manage allocations, so that I can grant time-off balances to employees

#### Acceptance Criteria

1. THE System SHALL provide an Allocations tab in the TimeoffPage component
2. THE System SHALL display Allocation records in a table with columns: Employee, Type, Total, Taken, Remaining, Valid from, Valid to
3. WHEN an Employee views the Allocations tab, THE System SHALL display only their own Allocations in read-only mode
4. WHEN an Approver views the Allocations tab, THE System SHALL display all Allocations
5. THE System SHALL display a "New allocation" form only for Approvers in the Allocations tab

### Requirement 14: Frontend Request Management Interface

**User Story:** As an Employee, I want a user interface to submit and track time-off requests, so that I can manage my time off efficiently

#### Acceptance Criteria

1. THE System SHALL provide a Requests tab in the TimeoffPage component
2. THE System SHALL display Request records in a table with columns: Employee, Type, Dates, Duration, Status
3. WHEN an Employee views the Requests tab, THE System SHALL display only their own Requests
4. WHEN an Employee views the Requests tab, THE System SHALL display a "Request time off" form with fields: type select, date range, reason
5. WHEN an Approver views the Requests tab, THE System SHALL display all Requests
6. WHEN an Approver views the Requests tab, THE System SHALL display Approve and Refuse buttons on pending Request rows
7. WHEN an Approver clicks Refuse, THE System SHALL prompt for an optional reason via a text input in a modal

### Requirement 15: Frontend API Integration

**User Story:** As a developer, I want a frontend API client for time-off operations, so that UI components can interact with the backend

#### Acceptance Criteria

1. THE System SHALL provide a timeoffApi module with functions: getTimeoffTypes, createTimeoffType, updateTimeoffType
2. THE System SHALL provide a timeoffApi module with functions: getAllocations, createAllocation
3. THE System SHALL provide a timeoffApi module with functions: getRequests, createRequest, approveRequest, refuseRequest
4. THE System SHALL implement all timeoffApi functions using the apiRequest wrapper pattern
5. THE System SHALL accept filters parameter in getTimeoffTypes, getAllocations, and getRequests functions
6. THE System SHALL accept reason parameter in the refuseRequest function

### Requirement 16: Frontend Smart Buttons Integration

**User Story:** As an Employee, I want quick access to time-off information from the employee detail view, so that I can navigate efficiently

#### Acceptance Criteria

1. THE System SHALL display a "Time Off" button in the SmartButtonsBar component on employee detail pages
2. WHEN the Time Off button is clicked, THE System SHALL navigate to the path "/timeoff?employee={employeeId}"
3. WHEN displaying the Time Off button, THE System SHALL fetch and display the count of Requests for the employee
4. WHEN fetching the Request count fails, THE System SHALL display the Time Off button without a count
