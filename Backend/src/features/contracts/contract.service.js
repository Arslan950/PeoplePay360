import { Contract } from "./contract.model.js";
import { ApiError } from "../../utils/api-error.js";

const resolveStatus = (contract, asOf = new Date()) => {
	if (!contract) return "draft";
	if (contract.status === "draft") return "draft";
	if (contract.status === "expired" || (contract.endDate && new Date(contract.endDate) < new Date(asOf))) return "expired";
	return "running";
};

const assertNoOverlap = async ({ employee, startDate, endDate, excludeContractId, status = "running" }) => {
	if (status !== "running") return;
	const newStart = new Date(startDate);
	const newEnd = endDate ? new Date(endDate) : null;
	const query = { employee, status: "running", _id: { $ne: excludeContractId || null } };
	const contracts = await Contract.find(query);
	for (const existing of contracts) {
		const existingStart = new Date(existing.startDate);
		const existingEnd = existing.endDate ? new Date(existing.endDate) : null;
		const existingStartsBeforeNewEnd = existingStart <= (newEnd || Infinity);
		const existingEndsAfterNewStart = (existingEnd || Infinity) >= newStart;
		if (existingStartsBeforeNewEnd && existingEndsAfterNewStart) {
			throw new ApiError(400, "Employee already has a running contract covering this period");
		}
	}
};

const nextContractNumber = async (year) => {
	const count = await Contract.countDocuments({
		startDate: {
			$gte: new Date(Date.UTC(year, 0, 1)),
			$lt: new Date(Date.UTC(year + 1, 0, 1)),
		},
	});
	return `CON/${year}/${String(count + 1).padStart(4, "0")}`;
};

export { resolveStatus, assertNoOverlap, nextContractNumber };

