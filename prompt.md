Here's the corrected, full prompt — ready to hand to your AI editor as-is.

---

```markdown
# Payroll Module — Full-Stack Implementation Prompt (Backend + Frontend)

Grounded in the organizer's Excalidraw mockup (`HRMS_OXP_-_24_hours.excalidraw`) AND verified against
the actual current codebase before writing this. Do not re-derive Contract's shape from the mockup —
Contract already exists and is live; its real shape is documented below and must be treated as fixed.

## Codebase conventions to follow (do not deviate)

MERN stack, feature-folder backend at `Backend/src/features/<feature>/`. Match existing patterns from
`employees/` and `contracts/`:
- Controllers use `asyncHandler`; errors are `new ApiError(status, message)`; success responses are
  `new ApiResponse(status, data, message)`.
- Routes protected with `requireAuth` + `requireRole(...roles)`.
- Frontend feature folders at `Frontend/src/features/<feature>/`, following the `<Feature>Page.jsx` →
  `<Feature>ListPage.jsx` / `<Feature>FormPage.jsx` split already used in `employees/` and `schedules/`.
- Reuse existing CSS classes (`.app-shell`, `.page-header`, `.detail-grid`, `.detail-field`, `.form-card`,
  `.smart-buttons-bar`) — don't introduce a new visual style.

---

## 0. Contract — already built, READ-ONLY reference (do not modify its existing fields)

Contract is fully implemented at `Backend/src/features/contracts/`. Its real shape, which Payroll must
consume as-is:

```
contractNumber: String, unique          // e.g. "CON/2026/0042" — NOT "code"
employee: ObjectId ref Employee, required
department: String
jobPosition: String
startDate: Date, required
endDate: Date | null                    // null = open-ended
wagePerMonth: Number, required          // NOT "wageMonthly" — use this exact field name everywhere
workingSchedule: ObjectId ref WorkingSchedule
salaryStructure: ObjectId, default null // currently has NO ref target set — see the one patch below
notes: String
```

`status` ("running" / "expired") is NOT a stored field — it's computed on every read via
`resolveStatus()` in `contract.service.js` (expired if `endDate` is in the past, running otherwise).
Payroll code that needs a contract's status must call the same logic or re-derive it the same way —
never assume `contract.status` exists on the raw document.

The "no overlapping Running contracts" rule is already enforced by `assertNoOverlap()` in
`contract.service.js`, called on every create/update. Nothing to build here.

**The one legitimate patch needed on Contract** (small, do this when creating the SalaryStructure model
in step 1 below): add `ref: "SalaryStructure"` to the existing `salaryStructure` field in
`contract.model.js` so it can be populated later. Do not rename the field, do not touch anything else in
this file.

---

## 1. Data Models — Payroll (all currently `// TODO` stubs — genuinely empty, build fresh)

### `SalaryStructure` (features/payroll/salaryStructure.model.js)
```
name: String, required            // e.g. "Regular Salary", "Intern Salary"
description: String
isActive: Boolean, default true
```
Rules belong to a structure (see below), not the other way around — no many-to-many join. A Structure is
just a named container; its Form view lists the Rules that reference it.

### `SalaryRule` (features/payroll/salaryRule.model.js)
```
name: String, required                     // e.g. "Basic Salary", "HRA", "Gross Salary", "Net Salary"
code: String, required, unique, uppercase  // e.g. "BASIC", "HRA", "GROSS", "NET"
category: enum ["basic", "allowance", "deduction", "gross", "net"], required
salaryStructure: ObjectId ref SalaryStructure, required
sequence: Number, required                 // execution order within its structure
computationType: enum ["fixed", "percentage", "formula"], required
fixedAmount: Number            // used when computationType = "fixed", e.g. Meal Allowance = 2000
percentageBase: enum ["contract_wage", "basic_salary", "gross_salary"]   // used when computationType = "percentage"
percentageValue: Number        // e.g. 20 for "HRA = 20% of Basic Salary"
formulaExpression: String      // used when computationType = "formula" — see engine notes below
isActive: Boolean, default true
```

List view columns (exact, per mockup): **name, code, category, structure, sequence.**

**On "Python Code / Formula":** the mockup's note (lifted from Odoo, which genuinely runs Python for
salary rules) describes formula rules for attendance-based pay, overtime, unpaid-leave deductions, or
calculations using multiple rule values. **Do not `eval()` anything** — that's a code-injection risk from
user-entered strings. Use `mathjs`'s `evaluate()` with a scope object built from previously-computed rule
codes plus contextual variables like `contractWage`. This is a deliberate MERN-safe adaptation of the
Odoo concept — flag it as such if asked, don't present it as a literal Python port.

### `Payrun` (features/payroll/payrun.model.js)
```
code: String, unique         // e.g. "PAYRUN/2026/02" — fine to call this "code", it's a new model, no clash
name: String, required       // e.g. "February 2026"
salaryStructure: ObjectId ref SalaryStructure, required   // selected once, applies to the whole batch
period: { startDate: Date, endDate: Date }, required
employees: [ObjectId ref Employee]
status: enum ["draft", "computed", "validated", "paid"], default "draft"
warnings: [String]
createdBy: ObjectId ref User
```

### `Payslip` (features/payroll/payslip.model.js)
```
payrun: ObjectId ref Payrun, required
employee: ObjectId ref Employee, required
contract: ObjectId ref Contract, required     // the Running contract resolved for this period
period: { startDate: Date, endDate: Date }, required
lines: [{ code: String, name: String, category: String, amount: Number }]
basicSalary: Number
grossSalary: Number
totalDeductions: Number
netSalary: Number
status: enum ["draft", "computed", "validated", "paid"], default "draft"
pdfGeneratedAt: Date
emailSentAt: Date
```
Unique compound index `{ employee: 1, payrun: 1 }` — this is what makes "duplicate payslip" warnings
detectable (the mockup explicitly calls this out as a warning users must see before finalizing).

---

## 2. Backend Flow

### Payrun creation — two-step wizard, exactly as mocked

**Step 1 — scope (`POST /payroll/payruns/draft`):** body = `{ name, salaryStructureId, period }`.
Creates a Payrun with `status: "draft"` and no employees yet. Returns eligible employees — active
employees with a Running contract (use `resolveStatus()`'s logic, not a stored field) overlapping
`period` — for the frontend's Step 2 employee-picker table. Each eligible employee's wage comes from
`contract.wagePerMonth`.

**Step 2 — employee selection (`PUT /payroll/payruns/:id/employees`):** body = `{ employeeIds }`. Per the
mockup: *"Continue only moves to employee selection. A Payrun is created only after clicking
'Create Payrun'."* Step 1's "Continue" is purely a client-side transition — the Payrun isn't meaningfully
"real" until this second call attaches employees. Don't let the frontend treat the draft call alone as
completion.

### Compute → Validate → Mark Paid (3 transitions across 4 states)

- `POST /payroll/payruns/:id/compute` — for each employee: resolve their Running contract valid for the
  period (via `resolveStatus()` logic) → run the rule engine using `payrun.salaryStructure`'s rules in
  sequence, reading `contract.wagePerMonth` as the wage base → upsert a Payslip. Collect warnings (no
  Running contract found, duplicate payslip already existing). Set `payrun.status = "computed"`.
- `POST /payroll/payruns/:id/validate` — moves Payrun + all its Payslips to `"validated"`. Surface
  `payrun.warnings` in the response and let the frontend block/confirm accordingly — don't swallow them.
- `POST /payroll/payruns/:id/mark-paid` — terminal state. Paid/finalized payroll must remain available as
  historical data — never allow delete or edit on a `paid` Payrun or its Payslips.

### Rule engine (features/payroll/ruleEngine.service.js)

Pure function: `computePayslip(contract, salaryStructure) -> { lines, basicSalary, grossSalary, totalDeductions, netSalary }`

1. Sort structure's rules by `sequence`.
2. Maintain `Map<code, value>`.
3. Per rule:
   - `fixed` → `rule.fixedAmount`
   - `percentage` → base value resolved from `percentageBase`: `"contract_wage"` → `contract.wagePerMonth`
     (note: `wagePerMonth`, matching Contract's real field name); `"basic_salary"` → `map.get("BASIC")`;
     `"gross_salary"` → `map.get("GROSS")`. Multiply by `percentageValue / 100`. Throw a clear error if the
     referenced code hasn't been computed yet — validate sequence ordering at Structure/Rule save time,
     not per-employee at compute time.
   - `formula` → evaluate `formulaExpression` via `mathjs.evaluate()` with a scope built from the map plus
     `{ contractWage: contract.wagePerMonth }`.
4. Push each result to `lines`; sum `category: "gross"` → `grossSalary`, `category: "deduction"` →
   `totalDeductions`; the `category: "net"` rule's value → `netSalary`.

### PDF (matches mockup: "PRINT PAYSLIP" button on the Payslip detail screen)

`GET /payroll/payslips/:id/pdf` — generate with `pdfkit` (lightweight, no headless-browser dependency).
Content: employee, period, contract wage, line-by-line breakdown grouped by category, net salary
highlighted. Set `pdfGeneratedAt`.

### Bulk email (matches mockup: "SEND PAYSLIPS" button on the Payrun screen, not the Payslip screen)

`POST /payroll/payruns/:id/send-payslips` — only once `status` is `validated` or `paid`. For each Payslip
in the Payrun: generate PDF (reuse the same function), email via `nodemailer` to the employee's account
email, attach PDF, set `emailSentAt`. Send in capped-concurrency batches (e.g. 5 at a time), return
`{ sent, failed: [...] }` — one failure must not hide the rest of the batch's result.

### RBAC (matches Roles.md's "hr_payroll_user/manager inherit everything hr_manager can do")
```
GET  salary-structures, salary-rules        requireAuth
POST/PUT/DELETE salary-structures, salary-rules   requireRole("hr_payroll_manager", "admin")
POST payruns/draft, PUT payruns/:id/employees,
  POST payruns/:id/compute, /validate        requireRole("hr_payroll_user", "hr_payroll_manager", "admin")
POST payruns/:id/mark-paid, DELETE payruns/:id   requireRole("hr_payroll_manager", "admin")  // irreversible, higher bar
POST payruns/:id/send-payslips              requireRole("hr_payroll_user", "hr_payroll_manager", "admin")
GET  payslips/:id/pdf                       requireAuth (employee can access their own; payroll roles access any)
```

---

## 3. Frontend — screens, exactly as mocked

### Navbar — this is NEW UI, not an extension of an existing pattern

Read `Frontend/src/common/components/Sidebar.jsx` first. It's currently a **flat list** — there is no
dropdown anywhere in the app yet (Employees, Contracts, Time Off are all single flat links). Do not
assume a dropdown pattern exists to copy.

Add dropdown support to `Sidebar.jsx`'s `navigationItems` model: change the Payroll entry from a flat
`{ id, label, path }` to `{ id: 'payroll', label: 'Payroll', children: [...] }` with four children —
Payruns (`/payroll/payruns`), Payslips (`/payroll/payslips`), Structures (`/payroll/structures`), Rules
(`/payroll/rules`). Render top-level items with children as a button that toggles a small submenu (reuse
`.navbar-item` styling for both the parent trigger and each child link; a simple `useState` open/closed
per item is enough, no new dependency needed). Keep every other nav item exactly as it is today.

### `PayrunsListPage.jsx`
List view, searchable (`Search payruns…`), rows show Payrun name/period/status. Clicking a row opens
`PayrunDetailPage`. A "NEW" button launches the wizard.

### New Payrun wizard (2-step modal)
**Step 1 fields:** `Pay Structure` (dropdown of Salary Structures), `Period` (date range picker,
start/end). Buttons: `Discard`, `Continue`.
**Step 2 ("Select Employee Records"):** searchable table with columns **checkbox, Employee, Working
Hours, Start Date, Wage** (Working Hours from their schedule, Wage from `contract.wagePerMonth`) — this
table is the eligible-employee list returned by the Step 1 draft API call. Buttons: `Back`,
`Create Payrun`. Only on `Create Payrun` does `PUT /payroll/payruns/:id/employees` fire.

### `PayrunDetailPage.jsx`
Header: `Payrun / <period name>`, subtitle "Open one Payrun to compute and manage its payslips." Shows
status, warnings list (if any), and action buttons that appear/disable based on current status: `Compute`
→ `Validate` → `Mark Paid`, plus `SEND PAYSLIPS`. Below: list of Payslips in this Payrun (name, net
salary, status) — clicking one opens `PayslipDetailPage`.

### `PayslipsListPage.jsx`
Global list of all payslips, searchable (`Search payslips…`), independent of any one Payrun — for
browsing history.

### `PayslipDetailPage.jsx`
Header: `Payslip / <employee name> / <period>`, subtitle "Detailed salary computation for one employee."
Shows `Salary Structure` used, then the line-by-line breakdown (Basic Salary → Gross Salary → ... → Net
Salary, each on its own row). `PRINT PAYSLIP` button triggers the PDF download endpoint.

### `SalaryStructuresPage.jsx` (List + Form)
List: name, description, rule count. Form: name/description, plus an embedded list of its Rules — the
Structure's Form view is really just a filtered view into Rules, since a structure is selected once when
a Payrun is created and isn't otherwise touched per-payrun.

### `SalaryRulesPage.jsx` (List + Form)
List columns (exact): **name, code, category, structure, sequence.** Form: all fields from the
`SalaryRule` model above, with `computationType` conditionally showing `fixedAmount`, or
`percentageBase` + `percentageValue`, or `formulaExpression` depending on selection.

---

## 4. Dashboard additions (Payroll-relevant pieces only — full dashboard is a separate module)

KPI cards (exact labels): **Total Net Salary Paid, Payslips Generated, Avg Salary / Employee** (captioned
"Based on current payrun").
Charts (exact labels + sources):
- **Salary Cost by Department** — source: Payslips + Employee Department
- **Monthly Net Salary Trend** — source: historical Payslips/Payruns
- **Payslip Status & Payroll Alerts** — source: Payrun + Payslip validation (e.g. "1 duplicate payslip
  warning" as an example alert)
Filters: Period, Department, Employee Type, Company.

---

## New dependencies needed (none currently in package.json — confirmed)

`npm install pdfkit mathjs nodemailer` in `Backend/`. Nothing else in the stack needs to change.

## Known open item, not in scope here

Employee has no bank-detail fields, so a literal "missing bank account" warning (mentioned loosely in the
mockup) can't be implemented yet. Skip that specific warning type for now — implement the duplicate-
payslip and missing-contract warnings only, which are fully specifiable from what already exists.
```

---

Want me to check `SalaryStructuresPage.jsx`/`SalaryRulesPage.jsx` naming or route paths against how `SchedulesPage.jsx` was actually wired once this is run, the same way I've been verifying each prior prompt's output?