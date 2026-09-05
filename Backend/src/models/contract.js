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
 