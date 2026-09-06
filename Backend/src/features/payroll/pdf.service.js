import PDFDocument from "pdfkit";

const palette = { ink: "#15213a", muted: "#64748b", line: "#d8e1ef", soft: "#f5f8fc", blue: "#2563eb", blueSoft: "#eaf2ff" };
const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const periodLabel = (period) => `${date(period?.startDate)} – ${date(period?.endDate)}`;
const rule = (doc, y, x1 = 44, x2 = 551, color = palette.line) => doc.save().strokeColor(color).lineWidth(1).moveTo(x1, y).lineTo(x2, y).stroke().restore();

const labelValue = (doc, { x, y, label, value, width = 220 }) => {
	doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x, y, { width, characterSpacing: .6 });
	doc.fillColor(palette.ink).font("Helvetica").fontSize(10.5).text(value || "—", x, y + 15, { width, ellipsis: true });
};

const componentRows = (lines = [], categories) => lines
	.filter((line) => categories.includes(String(line.category || "").toLowerCase()))
	.filter((line) => !["gross", "net"].includes(String(line.category || "").toLowerCase()));

const drawSectionTable = (doc, { x, y, width, title, rows, fallback, deduction = false }) => {
	const amountX = x + width - 96;
	doc.roundedRect(x, y, width, 29, 6).fill(deduction ? "#fff6ed" : palette.soft);
	doc.fillColor(deduction ? "#b45309" : palette.ink).font("Helvetica-Bold").fontSize(9).text(title.toUpperCase(), x + 12, y + 10, { characterSpacing: .55 });
	doc.fillColor(palette.muted).font("Helvetica-Bold").fontSize(8).text("AMOUNT", amountX, y + 10, { width: 84, align: "right", characterSpacing: .35 });
	let cursor = y + 29;
	const displayRows = rows.length ? rows : [{ name: fallback, isFallback: true }];
	for (const row of displayRows) {
		doc.fillColor("#ffffff").rect(x, cursor, width, 31).fill();
		doc.fillColor(palette.ink).font("Helvetica").fontSize(9.5).text(row.name || row.code || "Salary component", x + 12, cursor + 10, { width: width - 122, ellipsis: true });
		doc.fillColor(row.isFallback ? palette.muted : palette.ink).font("Helvetica-Bold").fontSize(9.5).text(row.isFallback ? "—" : money(row.amount), amountX, cursor + 10, { width: 84, align: "right" });
		rule(doc, cursor + 31, x, x + width, "#e8edf5");
		cursor += 31;
	}
	return cursor;
};

const generatePayslipPdfBuffer = async ({ employee, period, contractWage, lines = [], netSalary, grossSalary, totalDeductions, workedDays, expectedWorkingDays, payrunName, contractCode }) => new Promise((resolve, reject) => {
	const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `Payslip - ${employee?.name || "Employee"}`, Author: "PeoplePay360" } });
	const chunks = [];
	doc.on("data", (chunk) => chunks.push(chunk));
	doc.on("end", () => resolve(Buffer.concat(chunks)));
	doc.on("error", reject);

	doc.rect(0, 0, 595.28, 112).fill(palette.ink);
	doc.roundedRect(44, 30, 38, 38, 8).fill(palette.blue);
	doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13).text("PP", 44, 42, { width: 38, align: "center" });
	doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(15).text("PeoplePay360", 94, 34);
	doc.fillColor("#cbd7ea").font("Helvetica").fontSize(8.5).text("PEOPLE & PAYROLL OPERATIONS", 94, 54, { characterSpacing: .75 });
	doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20).text("PAYSLIP", 396, 35, { width: 155, align: "right", characterSpacing: .6 });
	doc.fillColor("#cbd7ea").font("Helvetica").fontSize(9).text(periodLabel(period), 350, 63, { width: 201, align: "right" });

	doc.roundedRect(44, 137, 507, 102, 9).fillAndStroke("#ffffff", palette.line);
	labelValue(doc, { x: 60, y: 155, label: "Employee", value: employee?.name, width: 225 });
	labelValue(doc, { x: 60, y: 199, label: "Email", value: employee?.email, width: 225 });
	labelValue(doc, { x: 320, y: 155, label: "Pay period", value: periodLabel(period), width: 210 });
	labelValue(doc, { x: 320, y: 199, label: "Payrun", value: payrunName || "Monthly payroll", width: 210 });

	doc.roundedRect(44, 258, 507, 56, 8).fill(palette.blueSoft);
	const days = expectedWorkingDays == null ? "—" : `${Number(workedDays || 0)} / ${Number(expectedWorkingDays)} days`;
	labelValue(doc, { x: 60, y: 271, label: "Worked days", value: days, width: 145 });
	labelValue(doc, { x: 226, y: 271, label: "Contract reference", value: contractCode || "—", width: 145 });
	labelValue(doc, { x: 392, y: 271, label: "Monthly contract wage", value: money(contractWage), width: 140 });

	doc.fillColor(palette.ink).font("Helvetica-Bold").fontSize(12).text("Salary breakdown", 44, 345);
	doc.fillColor(palette.muted).font("Helvetica").fontSize(9).text("A clear summary of earnings and deductions for this pay period.", 44, 363);
	const earnings = componentRows(lines, ["basic", "allowance", "earning"]);
	const deductions = componentRows(lines, ["deduction"]);
	const tableY = 392;
	const earningsEnd = drawSectionTable(doc, { x: 44, y: tableY, width: 245, title: "Earnings", rows: earnings, fallback: "No additional earnings" });
	const deductionsEnd = drawSectionTable(doc, { x: 306, y: tableY, width: 245, title: "Deductions", rows: deductions, fallback: "No deductions", deduction: true });
	const summaryY = Math.max(earningsEnd, deductionsEnd) + 24;

	doc.roundedRect(44, summaryY, 507, 88, 9).fill(palette.ink);
	doc.fillColor("#cbd7ea").font("Helvetica-Bold").fontSize(8).text("PAY SUMMARY", 60, summaryY + 18, { characterSpacing: .7 });
	doc.fillColor("#cbd7ea").font("Helvetica").fontSize(9).text(`Gross salary  ${money(grossSalary)}`, 60, summaryY + 42);
	doc.fillColor("#cbd7ea").font("Helvetica").fontSize(9).text(`Total deductions  ${money(totalDeductions)}`, 60, summaryY + 60);
	doc.fillColor("#9ae6c2").font("Helvetica-Bold").fontSize(9).text("NET PAY", 358, summaryY + 20, { width: 170, align: "right", characterSpacing: .65 });
	doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(19).text(money(netSalary), 300, summaryY + 39, { width: 228, align: "right" });

	const footerY = Math.min(summaryY + 120, 760);
	rule(doc, footerY);
	doc.fillColor(palette.muted).font("Helvetica").fontSize(8).text("This is a system-generated payslip and does not require a signature.", 44, footerY + 13);
	doc.text(`Generated ${date(new Date())}`, 390, footerY + 13, { width: 161, align: "right" });
	doc.end();
});

export { generatePayslipPdfBuffer };
