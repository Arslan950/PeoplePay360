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
    required:true,
  }, // used for the "missing bank details" payroll warning
  email: String,
}, { timestamps: true });
 