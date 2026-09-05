import { Router } from "express";
import { requireAuth } from "../../common/middleware/auth.middleware.js";
import { requireRole } from "../../common/middleware/role.middleware.js";
import { listSalaryStructures, createSalaryStructure, updateSalaryStructure, deleteSalaryStructure } from "./salaryStructure.controller.js";
import { listPayruns, getPayrunById, createDraftPayrun, setEmployeesOnPayrun, computePayrun, validatePayrun, markPaidPayrun, deletePayrun, sendPayslips } from "./payrun.controller.js";
import { getPayslips, getPayslipById, getPayslipPdf } from "./payslip.controller.js";

const router = Router();

router.get("/salary-structures", requireAuth, listSalaryStructures);
router.post("/salary-structures", requireAuth, requireRole("hr_payroll_manager", "admin"), createSalaryStructure);
router.put("/salary-structures/:id", requireAuth, requireRole("hr_payroll_manager", "admin"), updateSalaryStructure);
router.delete("/salary-structures/:id", requireAuth, requireRole("hr_payroll_manager", "admin"), deleteSalaryStructure);

router.post("/payruns/draft", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), createDraftPayrun);
router.get("/payruns", requireAuth, listPayruns);
router.get("/payruns/:id", requireAuth, getPayrunById);
router.put("/payruns/:id/employees", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), setEmployeesOnPayrun);
router.post("/payruns/:id/compute", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), computePayrun);
router.post("/payruns/:id/validate", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), validatePayrun);
router.post("/payruns/:id/mark-paid", requireAuth, requireRole("hr_payroll_manager", "admin"), markPaidPayrun);
router.post("/payruns/:id/send-payslips", requireAuth, requireRole("hr_payroll_user", "hr_payroll_manager", "admin"), sendPayslips);
router.delete("/payruns/:id", requireAuth, requireRole("hr_payroll_manager", "admin"), deletePayrun);

router.get("/payslips", requireAuth, getPayslips);
router.get("/payslips/:id", requireAuth, getPayslipById);
router.get("/payslips/:id/pdf", requireAuth, getPayslipPdf);

export default router;
