import { create, all } from "mathjs";

const math = create(all, {});

const toNumber = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
};

const assertSafeFormula = (expression) => {
	if (typeof expression !== "string" || !expression.trim()) {
		throw new Error("Formula expression is required");
	}
	if (!/^[\d\sA-Za-z_+\-*/%().,]+$/.test(expression)
		|| /\b(import|createUnit|evaluate|parse|simplify|derivative|help|function)\b/i.test(expression)) {
		throw new Error("Formula contains unsupported syntax");
	}
};

const computePayslip = (contract, salaryStructure, workedDays = 0) => {
	if (!contract) {
		throw new Error("Contract is required to compute a payslip");
	}

	const rules = [...(salaryStructure?.rules || [])]
		.filter((rule) => rule.isActive !== false)
		.sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0));
	const values = new Map();
	const lines = [];
	let grossSalary = 0;
	let totalDeductions = 0;
	let netSalary = 0;
	let basicSalary = 0;

	for (const rule of rules) {
		let value = 0;

		switch (rule.computationType) {
			case "fixed": {
				value = toNumber(rule.fixedAmount);
				break;
			}
			case "percentage": {
				let baseValue = 0;
				if (rule.percentageBase === "contract_wage") {
					baseValue = toNumber(contract.wageMonthly);
				} else if (rule.percentageBase === "basic_salary") {
					if (!values.has("BASIC")) {
						throw new Error(`Rule "${rule.name}" references BASIC before it is computed`);
					}
					baseValue = toNumber(values.get("BASIC"));
				} else if (rule.percentageBase === "gross_salary") {
					if (!values.has("GROSS")) {
						throw new Error(`Rule "${rule.name}" references GROSS before it is computed`);
					}
					baseValue = toNumber(values.get("GROSS"));
				}
				value = baseValue * (toNumber(rule.percentageValue) / 100);
				break;
			}
			case "formula": {
				assertSafeFormula(rule.formulaExpression);
				const scope = {};
				for (const [code, computedValue] of values.entries()) scope[code] = computedValue;
				scope.contractWage = toNumber(contract.wageMonthly);
				scope.workedDays = toNumber(workedDays);
				try {
					value = Number(math.evaluate(rule.formulaExpression, scope));
				} catch (error) {
					throw new Error(`Formula rule "${rule.name}" failed: ${error.message}`);
				}
				break;
			}
			default:
				throw new Error(`Unsupported computationType: ${rule.computationType}`);
		}

		const resolvedValue = Number.isFinite(value) ? Number(value) : 0;
		const code = String(rule.code || "").toUpperCase();
		values.set(code, resolvedValue);
		lines.push({ code, name: rule.name, category: rule.category, amount: resolvedValue });

		if (rule.category === "gross") grossSalary += resolvedValue;
		if (rule.category === "deduction") totalDeductions += resolvedValue;
		if (rule.category === "net") netSalary = resolvedValue;
		if (rule.category === "basic") basicSalary = resolvedValue;
	}

	return {
		lines,
		basicSalary,
		grossSalary,
		totalDeductions,
		netSalary,
	};
};

export { computePayslip };
