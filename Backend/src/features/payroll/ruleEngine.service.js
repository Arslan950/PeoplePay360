import { evaluate } from "mathjs";
import { ApiError } from "../../utils/api-error.js";

const asNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const getBasicAmount = (contract, workedHours = 0) => {
	if (!contract) return 0;
	if (contract.wageType === "hourly") {
		return asNumber(contract.wageAmount || 0) * asNumber(workedHours || 0);
	}
	return asNumber(contract.wageAmount || contract.wagePerMonth || contract.wage || 0);
};

const safeFormula = (expression, scope) => {
	const stripped = String(expression ?? "").replace(/\s+/g, "");
	if (!stripped) return 0;
	const allowedPattern = /^[A-Za-z0-9_+\-*/().,\s]+$/;
	if (!allowedPattern.test(stripped)) {
		throw new ApiError(400, "Formula expression contains unsupported characters");
	}
	return evaluate(stripped, scope);
};

const computePayslipLines = (contract, salaryStructure, options = {}) => {
	const workingRules = Array.isArray(salaryStructure?.rules) ? [...salaryStructure.rules] : [];
	const entries = workingRules
		.map((entry) => ({
			...entry,
			sequence: entry.sequence ?? 0,
			rule: entry.rule && typeof entry.rule === "object" && entry.rule !== null ? entry.rule : null,
		}))
		.sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0));

	const values = new Map();
	const lines = [];
	const workedHours = asNumber(options.workedHours || 0);

	for (const entry of entries) {
		const rule = entry.rule ?? entry;
		const code = String(rule.code || "").trim().toUpperCase();
		const name = rule.name || code;
		const category = rule.category || "allowance";
		let value;

		if (rule.computationType === "fixed") {
			value = code === "BASIC" ? getBasicAmount(contract, workedHours) : asNumber(rule.fixedAmount || 0);
		} else if (rule.computationType === "percentage") {
			const percentageOf = String(rule.percentageOf || "").trim().toUpperCase();
			if (!values.has(percentageOf)) {
				throw new ApiError(400, `Rule ${code} references unknown code ${percentageOf}`);
			}
			value = values.get(percentageOf) * (asNumber(rule.percentageValue || 0) / 100);
		} else if (rule.computationType === "formula") {
			const expression = String(rule.formulaExpression || "").trim();
			if (!expression) {
				throw new ApiError(400, `Rule ${code} is missing a formula expression`);
			}
			const scope = {};
			for (const [entryCode, amount] of values.entries()) {
				scope[entryCode] = amount;
			}
			value = safeFormula(expression, scope);
		} else {
			value = 0;
		}

		const numericValue = asNumber(value || 0);
		values.set(code, numericValue);
		lines.push({ code, name, category, amount: numericValue });
	}

	const grossSalary = lines
		.filter((line) => line.category === "gross")
		.reduce((sum, line) => sum + Number(line.amount || 0), 0);
	const totalDeductions = lines
		.filter((line) => line.category === "deduction")
		.reduce((sum, line) => sum + Number(line.amount || 0), 0);
	const netLine = [...lines].reverse().find((line) => line.category === "net");
	const netSalary = netLine ? Number(netLine.amount || 0) : 0;

	return { lines, grossSalary, totalDeductions, netSalary };
};

export { computePayslipLines };
