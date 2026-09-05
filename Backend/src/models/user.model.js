/* ------------------------------------------------------------------ */
/* 1. USER (auth + role, separate from Employee profile)              */
/* ------------------------------------------------------------------ */
const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true ,minlength: 8},
  role: {
    type: String,
    enum: ['employee', 'hr_manager', 'hr_payroll_user', 'hr_payroll_manager', 'admin'],
    default: 'employee',
  },
  isSystemAdmin: { type: Boolean, default: false }, // separate axis from role
  employee: { type: Schema.Types.ObjectId, ref: 'Employee' }, // link back if this user IS an employee
  isActive: { type: Boolean, default: true },
}, { timestamps: true });


userSchema.pre("save", async function (next) {
    if (!this.isModified("passwordHash")) { return }

    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);

});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.passwordHash);
};
export const User = mongoose.model('User', userSchema);