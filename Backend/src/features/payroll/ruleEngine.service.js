import { create, all } from "mathjs";

const math = create(all, {});

const toNumber = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
};

const computePayslip = (contract, salaryStructure, workedDays = 0) => {
	if (!contract) {
		throw new Error("Contract is required to compute a payslip");
	}
	if (!salaryStructure?.mathematicalFormula) {
		throw new Error("Salary structure requires a mathematical formula");
	}

	const scope = {
		contractWage: toNumber(contract.wageMonthly),
		workedDays: toNumber(workedDays),
	};

	try {
		math.evaluate(salaryStructure.mathematicalFormula, scope);
	} catch (error) {
		throw new Error(`Formula evaluation failed: ${error.message}`);
	}

	const basicSalary = toNumber(scope.BASIC);
	const grossSalary = toNumber(scope.GROSS);
	const netSalary = toNumber(scope.NET);
	const totalDeductions = toNumber(scope.DEDUCTIONS) || (grossSalary - netSalary);

	const lines = Object.entries(scope)
		.filter(([key]) => !["contractWage", "workedDays"].includes(key))
		.map(([key, value]) => {
			const amount = toNumber(value);
			let category = "allowance";
			if (key === "GROSS") category = "gross";
			else if (key === "NET") category = "net";
			else if (key === "BASIC") category = "basic";
			else if (key === "DEDUCTIONS" || amount < 0) category = "deduction";

			return {
				code: key,
				name: key.replace(/_/g, " "),
				category,
				amount: Math.abs(amount),
			};
		});

	return {
		lines,
		basicSalary,
		grossSalary,
		totalDeductions,
		netSalary,
	};
};

export { computePayslip };
