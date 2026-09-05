import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
	getTimeoffTypes,
	createTimeoffType,
	updateTimeoffType,
	getAllocations,
	createAllocation,
	getRequests,
	createRequest,
	approveRequest,
	refuseRequest,
} from "./timeoffApi";
import { getEmployees } from "../employees/employeeApi";
import DateInput from "../../common/components/DateInput";

export default function TimeoffPage() {
	const { user } = useAuth();
	const [searchParams] = useSearchParams();
	const [activeTab, setActiveTab] = useState("requests");
	const isApprover = user?.role === "admin" || user?.role === "hr_manager";
	const isEmployee = user?.role === "employee";

	return (
		<main className="app-shell">
			<header className="page-header">
				<div>
					<p className="eyebrow">PeoplePay360</p>
					<h1>Time Off</h1>
				</div>
			</header>

			<nav className="toolbar">
				<button
					className={activeTab === "requests" ? "" : "secondary"}
					onClick={() => setActiveTab("requests")}
				>
					Requests
				</button>
				<button
					className={activeTab === "allocations" ? "" : "secondary"}
					onClick={() => setActiveTab("allocations")}
				>
					Allocations
				</button>
				<button
					className={activeTab === "types" ? "" : "secondary"}
					onClick={() => setActiveTab("types")}
				>
					Time Off Types
				</button>
			</nav>

			{activeTab === "requests" && <RequestsTab isApprover={isApprover} isEmployee={isEmployee} employeeFilter={searchParams.get("employee")} />}
			{activeTab === "allocations" && <AllocationsTab isApprover={isApprover} employeeFilter={searchParams.get("employee")} />}
			{activeTab === "types" && <TypesTab isApprover={isApprover} />}
		</main>
	);
}

// ========== REQUESTS TAB ==========
function RequestsTab({ isApprover, isEmployee, employeeFilter }) {
	const [requests, setRequests] = useState([]);
	const [types, setTypes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({ timeoffType: "", startDate: "", endDate: "", reason: "" });
	const [refuseModal, setRefuseModal] = useState(null);
	const [refusalReason, setRefusalReason] = useState("");

	const loadRequests = async () => {
		setLoading(true);
		setError("");
		try {
			const filters = {};
			if (employeeFilter) filters.employee = employeeFilter;
			const data = await getRequests(filters);
			setRequests(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const loadTypes = async () => {
		try {
			const data = await getTimeoffTypes({ status: "active" });
			setTypes(data);
		} catch (err) {
			setError(err.message);
		}
	};

	useEffect(() => {
		loadRequests();
		loadTypes();
	}, [employeeFilter]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		try {
			await createRequest(formData);
			setFormData({ timeoffType: "", startDate: "", endDate: "", reason: "" });
			loadRequests();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleApprove = async (id) => {
		setError("");
		try {
			await approveRequest(id);
			loadRequests();
		} catch (err) {
			setError(err.message);
		}
	};

	const handleRefuse = async () => {
		setError("");
		try {
			await refuseRequest(refuseModal, refusalReason);
			setRefuseModal(null);
			setRefusalReason("");
			loadRequests();
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<section>
			{error && <p className="error">{error}</p>}

			{/* Employees submit requests for their own linked employee record. */}
			{isEmployee && <div className="form-card">
				<h2>Request Time Off</h2>
				<form onSubmit={handleSubmit}>
					<select
						value={formData.timeoffType}
						onChange={(e) => setFormData({ ...formData, timeoffType: e.target.value })}
						required
					>
						<option value="">Select type</option>
						{types.map((type) => (
							<option key={type._id} value={type._id}>
								{type.name}
							</option>
						))}
					</select>
					<DateInput
						value={formData.startDate}
						onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
						placeholder="e.g. 2026-01-15"
						required
					/>
					<DateInput
						value={formData.endDate}
						onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
						placeholder="e.g. 2026-01-20"
						required
					/>
					<textarea
						placeholder="Reason (optional)"
						value={formData.reason}
						onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
					/>
					<button type="submit">Submit Request</button>
				</form>
			</div>}

			{/* Requests Table */}
			{loading ? (
				<p>Loading...</p>
			) : (
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Employee</th>
								<th>Type</th>
								<th>Dates</th>
								<th>Duration</th>
								<th>Status</th>
								<th>Reason</th>
								{isApprover && <th>Actions</th>}
							</tr>
						</thead>
						<tbody>
							{requests.map((request) => (
								<tr key={request._id}>
									<td>{request.employee?.name || "-"}</td>
									<td>{request.timeoffType?.name || "-"}</td>
									<td>
										{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
									</td>
									<td>{request.duration} days</td>
									<td>
										<span className={`status ${request.status}`}>{request.status}</span>
									</td>
									<td>
										{request.reason || "-"}
										{request.refusalReason && <small> (Refused: {request.refusalReason})</small>}
									</td>
									{isApprover && (
										<td>
											{request.status === "pending" && (
												<>
													<button className="link-button" onClick={() => handleApprove(request._id)}>
														Approve
													</button>
													{" | "}
													<button className="link-button" onClick={() => setRefuseModal(request._id)}>
														Refuse
													</button>
												</>
											)}
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Refusal Modal */}
			{refuseModal && (
				<div className="modal">
					<div className="modal-card">
						<h2>Refuse Request</h2>
						<textarea
							placeholder="Reason (optional)"
							value={refusalReason}
							onChange={(e) => setRefusalReason(e.target.value)}
						/>
						<div className="page-actions">
							<button onClick={handleRefuse}>Refuse</button>
							<button className="secondary" onClick={() => { setRefuseModal(null); setRefusalReason(""); }}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

// ========== ALLOCATIONS TAB ==========
function AllocationsTab({ isApprover, employeeFilter }) {
	const [allocations, setAllocations] = useState([]);
	const [employees, setEmployees] = useState([]);
	const [types, setTypes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({ employee: "", timeoffType: "", totalDays: "", validFrom: "", validTo: "" });

	const loadAllocations = async () => {
		setLoading(true);
		setError("");
		try {
			const filters = {};
			if (employeeFilter) filters.employee = employeeFilter;
			const data = await getAllocations(filters);
			setAllocations(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const loadEmployeesAndTypes = async () => {
		try {
			const [empData, typeData] = await Promise.all([
				getEmployees(),
				getTimeoffTypes({ status: "active" }),
			]);
			setEmployees(empData);
			setTypes(typeData);
		} catch (err) {
			setError(err.message);
		}
	};

	useEffect(() => {
		loadAllocations();
		if (isApprover) loadEmployeesAndTypes();
	}, [employeeFilter, isApprover]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		try {
			await createAllocation({
				...formData,
				validFrom: formData.validFrom || null,
				validTo: formData.validTo || null,
			});
			setFormData({ employee: "", timeoffType: "", totalDays: "", validFrom: "", validTo: "" });
			loadAllocations();
		} catch (err) {
			setError(err.message);
		}
	};

	return (
		<section>
			{error && <p className="error">{error}</p>}

			{/* Allocation Form (Approvers Only) */}
			{isApprover && (
				<div className="form-card">
					<h2>New Allocation</h2>
					<form onSubmit={handleSubmit}>
						<select
							value={formData.employee}
							onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
							required
						>
							<option value="">Select employee</option>
							{employees.map((emp) => (
								<option key={emp._id} value={emp._id}>
									{emp.name}
								</option>
							))}
						</select>
						<select
							value={formData.timeoffType}
							onChange={(e) => setFormData({ ...formData, timeoffType: e.target.value })}
							required
						>
							<option value="">Select type</option>
							{types.map((type) => (
								<option key={type._id} value={type._id}>
									{type.name}
								</option>
							))}
						</select>
						<input
							type="number"
							placeholder="Total days"
							value={formData.totalDays}
							onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
							min="0"
							required
						/>
						<DateInput
							placeholder="e.g. 2026-01-01 (optional)"
							value={formData.validFrom}
							onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
						/>
						<DateInput
							placeholder="e.g. 2026-12-31 (optional)"
							value={formData.validTo}
							onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
						/>
						<button type="submit">Create Allocation</button>
					</form>
				</div>
			)}

			{/* Allocations Table */}
			{loading ? (
				<p>Loading...</p>
			) : (
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Employee</th>
								<th>Type</th>
								<th>Total</th>
								<th>Taken</th>
								<th>Remaining</th>
								<th>Valid From</th>
								<th>Valid To</th>
							</tr>
						</thead>
						<tbody>
							{allocations.map((allocation) => (
								<tr key={allocation._id}>
									<td>{allocation.employee?.name || "-"}</td>
									<td>{allocation.timeoffType?.name || "-"}</td>
									<td>{allocation.totalDays}</td>
									<td>{allocation.takenDays}</td>
									<td>{allocation.remainingDays}</td>
									<td>{allocation.validFrom ? new Date(allocation.validFrom).toLocaleDateString() : "N/A"}</td>
									<td>{allocation.validTo ? new Date(allocation.validTo).toLocaleDateString() : "N/A"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}

// ========== TIME OFF TYPES TAB ==========
function TypesTab({ isApprover }) {
	const [types, setTypes] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [editingType, setEditingType] = useState(null);
	const [formData, setFormData] = useState({
		name: "",
		unit: "days",
		requiresAllocation: true,
		requiresApproval: true,
		status: "active",
	});

	const loadTypes = async () => {
		setLoading(true);
		setError("");
		try {
			const data = await getTimeoffTypes();
			setTypes(data);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadTypes();
	}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		try {
			if (editingType) {
				await updateTimeoffType(editingType, formData);
				setEditingType(null);
			} else {
				await createTimeoffType(formData);
			}
			setFormData({ name: "", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" });
			loadTypes();
		} catch (err) {
			setError(err.message);
		}
	};

	const startEdit = (type) => {
		setEditingType(type._id);
		setFormData({
			name: type.name,
			unit: type.unit,
			requiresAllocation: type.requiresAllocation,
			requiresApproval: type.requiresApproval,
			status: type.status,
		});
	};

	const cancelEdit = () => {
		setEditingType(null);
		setFormData({ name: "", unit: "days", requiresAllocation: true, requiresApproval: true, status: "active" });
	};

	return (
		<section>
			{error && <p className="error">{error}</p>}

			{/* Type Form (Approvers Only) */}
			{isApprover && (
				<div className="form-card">
					<h2>{editingType ? "Edit Time Off Type" : "New Time Off Type"}</h2>
					<form onSubmit={handleSubmit}>
						<input
							type="text"
							placeholder="Name"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							required
						/>
						<select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
							<option value="days">Days</option>
							<option value="hours">Hours</option>
						</select>
						<label>
							<input
								type="checkbox"
								checked={formData.requiresAllocation}
								onChange={(e) => setFormData({ ...formData, requiresAllocation: e.target.checked })}
							/>
							Requires Allocation
						</label>
						<label>
							<input
								type="checkbox"
								checked={formData.requiresApproval}
								onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
							/>
							Requires Approval
						</label>
						<select
							value={formData.status}
							onChange={(e) => setFormData({ ...formData, status: e.target.value })}
						>
							<option value="active">Active</option>
							<option value="archived">Archived</option>
						</select>
						<div className="page-actions">
							<button type="submit">{editingType ? "Update" : "Create"}</button>
							{editingType && (
								<button type="button" className="secondary" onClick={cancelEdit}>
									Cancel
								</button>
							)}
						</div>
					</form>
				</div>
			)}

			{/* Types Table */}
			{loading ? (
				<p>Loading...</p>
			) : (
				<div className="table-wrap">
					<table>
						<thead>
							<tr>
								<th>Name</th>
								<th>Unit</th>
								<th>Requires Allocation</th>
								<th>Requires Approval</th>
								<th>Status</th>
								{isApprover && <th>Actions</th>}
							</tr>
						</thead>
						<tbody>
							{types.map((type) => (
								<tr key={type._id}>
									<td>{type.name}</td>
									<td>{type.unit}</td>
									<td>{type.requiresAllocation ? "Yes" : "No"}</td>
									<td>{type.requiresApproval ? "Yes" : "No"}</td>
									<td>
										<span className={`status ${type.status}`}>{type.status}</span>
									</td>
									{isApprover && (
										<td>
											<button className="link-button" onClick={() => startEdit(type)}>
												Edit
											</button>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
