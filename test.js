/**
 * PeoplePay360 — Mongoose Data Models (MERN stack)
 * Each section is a separate collection. Relationships use ObjectId refs
 * where data changes independently, and embedded sub-schemas where the
 * data is small, fixed-shape, and always read together with its parent.
 */
 
const mongoose = require('mongoose');
const { Schema, model } = mongoose;
 
/* ------------------------------------------------------------------ */
/* 1. USER (auth + role, separate from Employee profile)              */
/* ------------------------------------------------------------------ */
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'],
    default: 'employee',
  },
  isSystemAdmin: { type: Boolean, default: false }, // separate axis from role
  employee: { type: Schema.Types.ObjectId, ref: 'Employee' }, // link back if this user IS an employee
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* 2. EMPLOYEE — the central hub                                      */
/* ------------------------------------------------------------------ */
const employeeSchema = new Schema({
  name: { type: String, required: true },
  jobPosition: String,
  department: String,
  manager: { type: Schema.Types.ObjectId, ref: 'Employee' },
  workingSchedule: { type: Schema.Types.ObjectId, ref: 'WorkingSchedule' },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  employeeType: { type: String, enum: ['full_time', 'contract', 'intern'], default: 'full_time' },
  bankDetails: {
    accountNumber: String,
    ifsc: String,
    accountHolderName: String,
  }, // used for the "missing bank details" payroll warning
  email: String,
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* 3. CONTRACT — historical, but only ONE may be active per period    */
/* ------------------------------------------------------------------ */
const contractSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // null = currently open-ended
  department: String,
  jobPosition: String,
  wage: { type: Number, required: true },
  salaryStructure: { type: Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  status: { type: String, enum: ['draft', 'active', 'expired', 'terminated'], default: 'draft' },
}, { timestamps: true });
 
// Helper used by the service layer (not a Mongo feature) — enforce no
// two "active" contracts overlapping in date range for the same employee.
// Enforce this in application logic on save, since Mongo can't do it via a unique index alone.
 
/* ------------------------------------------------------------------ */
/* 4. WORKING SCHEDULE — weekly pattern embedded, hours auto-computed */
/* ------------------------------------------------------------------ */
const schedulePeriodSchema = new Schema({
  day: { type: String, enum: ['mon','tue','wed','thu','fri','sat','sun'], required: true },
  startTime: String, // "09:00"
  endTime: String,   // "18:00"
  breakMinutes: { type: Number, default: 0 },
}, { _id: false });
 
const workingScheduleSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['full_time', 'part_time', 'shift'], default: 'full_time' },
  periods: [schedulePeriodSchema],
  totalWeeklyHours: { type: Number, default: 0 }, // computed on save, not entered manually
}, { timestamps: true });
 
workingScheduleSchema.pre('save', function (next) {
  this.totalWeeklyHours = this.periods.reduce((sum, p) => {
    const [sh, sm] = p.startTime.split(':').map(Number);
    const [eh, em] = p.endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm) - (p.breakMinutes || 0);
    return sum + mins / 60;
  }, 0);
  next();
});
 
/* ------------------------------------------------------------------ */
/* 5. ATTENDANCE                                                      */
/* ------------------------------------------------------------------ */
const attendanceSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  checkIn: { type: Date, required: true },
  checkOut: Date,
  workedHours: Number, // computed on checkOut
  status: { type: String, enum: ['present', 'late', 'absent', 'overtime', 'missing_checkout'], default: 'present' },
  isManualCorrection: { type: Boolean, default: false },
  correctedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* 6. TIME OFF: Type, Allocation, Request                             */
/* ------------------------------------------------------------------ */
const timeOffTypeSchema = new Schema({
  name: { type: String, required: true },
  unit: { type: String, enum: ['days', 'hours'], default: 'days' },
  requiresAllocation: { type: Boolean, default: true },
  requiresApproval: { type: Boolean, default: true },
  affectsPayroll: { type: Boolean, default: false }, // e.g. unpaid leave deducts salary
}, { timestamps: true });
 
const allocationSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  timeOffType: { type: Schema.Types.ObjectId, ref: 'TimeOffType', required: true },
  allocated: { type: Number, required: true },
  taken: { type: Number, default: 0 },
  remaining: { type: Number, default: function () { return this.allocated; } },
  validFrom: Date,
  validTo: Date,
  status: { type: String, enum: ['pending', 'approved', 'refused'], default: 'pending' },
}, { timestamps: true });
 
const timeOffRequestSchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  timeOffType: { type: Schema.Types.ObjectId, ref: 'TimeOffType', required: true },
  allocation: { type: Schema.Types.ObjectId, ref: 'Allocation' }, // which balance this draws from
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: Number, // in the type's unit (days/hours)
  status: { type: String, enum: ['pending', 'approved', 'refused'], default: 'pending' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* 7. SALARY STRUCTURE & RULE                                         */
/* ------------------------------------------------------------------ */
const salaryRuleSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // e.g. "BASIC", "HRA", "PF"
  category: { type: String, enum: ['basic', 'allowance', 'gross', 'deduction', 'net'], required: true },
  sequence: { type: Number, required: true }, // execution order
  computationMethod: { type: String, enum: ['fixed', 'percentage', 'formula'], required: true },
  amount: Number,          // used if fixed
  percentageOf: String,    // rule code to base percentage on, if percentage
  percentageValue: Number,
  formula: String,         // e.g. "BASIC * 0.1 + HRA" — evaluated by the rule engine
}, { timestamps: true });
 
const salaryStructureSchema = new Schema({
  name: { type: String, required: true }, // e.g. "Regular Salary"
  rules: [{ type: Schema.Types.ObjectId, ref: 'SalaryRule' }], // ordered by rule.sequence at compute time
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* 8. PAYRUN & PAYSLIP                                                */
/* ------------------------------------------------------------------ */
const payrunSchema = new Schema({
  name: { type: String, required: true }, // e.g. "September 2026 Payrun"
  salaryStructure: { type: Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  employees: [{ type: Schema.Types.ObjectId, ref: 'Employee' }], // selected in wizard step 2
  status: {
    type: String,
    enum: ['draft', 'computed', 'validated', 'paid'],
    default: 'draft',
  },
  warnings: [{
    type: { type: String, enum: ['missing_bank_details', 'duplicate_payslip', 'contract_attention'] },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    message: String,
  }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
 
// Payslip components are embedded — they're a fixed-shape breakdown that's
// always read together with the payslip and never queried independently.
const payslipLineSchema = new Schema({
  ruleCode: String,
  ruleName: String,
  category: String,
  amount: Number,
}, { _id: false });
 
const payslipSchema = new Schema({
  payrun: { type: Schema.Types.ObjectId, ref: 'Payrun', required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  contract: { type: Schema.Types.ObjectId, ref: 'Contract', required: true }, // the period-applicable contract, resolved at compute time
  salaryStructure: { type: Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  periodStart: Date,
  periodEnd: Date,
  workedDays: Number,
  lines: [payslipLineSchema], // Basic, Allowances, Deductions, Gross, Net breakdown
  grossSalary: Number,
  netSalary: Number,
  status: { type: String, enum: ['draft', 'computed', 'validated', 'paid'], default: 'draft' },
  pdfUrl: String, // path/URL to generated payslip PDF
  emailSentAt: Date,
}, { timestamps: true });
 
/* ------------------------------------------------------------------ */
/* Exports                                                            */
/* ------------------------------------------------------------------ */
module.exports = {
  User: model('User', userSchema),
  Employee: model('Employee', employeeSchema),
  Contract: model('Contract', contractSchema),
  WorkingSchedule: model('WorkingSchedule', workingScheduleSchema),
  Attendance: model('Attendance', attendanceSchema),
  TimeOffType: model('TimeOffType', timeOffTypeSchema),
  Allocation: model('Allocation', allocationSchema),
  TimeOffRequest: model('TimeOffRequest', timeOffRequestSchema),
  SalaryRule: model('SalaryRule', salaryRuleSchema),
  SalaryStructure: model('SalaryStructure', salaryStructureSchema),
  Payrun: model('Payrun', payrunSchema),
  Payslip: model('Payslip', payslipSchema),
};