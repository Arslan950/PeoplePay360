import { asyncHandler } from "../../utils/async-handler.js";
import { ApiResponse } from "../../utils/api-response.js";
import { getPayrollDashboard } from "./dashboard.aggregation.service.js";

const getDashboard = asyncHandler(async (req, res) => {
	const data = await getPayrollDashboard(req.query);
	return res.status(200).json(new ApiResponse(200, data));
});

export { getDashboard };
