import PDFDocument from "pdfkit";

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const generatePayslipPdf = async (payslip, employee, contract) => {
	const doc = new PDFDocument({ size: "A5", margin: 36 });
	const chunks = [];
	return new Promise((resolve, reject) => {
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		doc.fontSize(18).text("PeoplePay360 Payslip", { align: "center" });
		doc.moveDown(0.75);
		doc.fontSize(10).text(`Employee: ${employee?.name || "Unknown"}`);
		doc.text(`Employee ID: ${employee?._id ? String(employee._id) : "N/A"}`);
		doc.text(`Pay period: ${new Date(payslip.period.startDate).toLocaleDateString()} - ${new Date(payslip.period.endDate).toLocaleDateString()}`);
		doc.text(`Wage type: ${contract?.wageType || "monthly"}`);
		doc.moveDown(0.75);

		const grouped = {
			basic: [],
			allowance: [],
			gross: [],
			deduction: [],
			net: [],
		};
		for (const line of payslip.lines || []) {
			const bucket = grouped[line.category] || [];
			bucket.push(line);
		}

		const orderedCategories = ["basic", "allowance", "gross", "deduction", "net"];
		for (const category of orderedCategories) {
			const lines = grouped[category] || [];
			if (!lines.length) continue;
			doc.moveDown(0.5);
			doc.fontSize(12).text(category.charAt(0).toUpperCase() + category.slice(1), { underline: true });
			for (const line of lines) {
				doc.fontSize(10).text(`${line.name}: ${formatCurrency(line.amount)}`);
			}
		}

		doc.moveDown(1);
		doc.fontSize(12).text(`Gross Salary: ${formatCurrency(payslip.grossSalary || 0)}`);
		doc.text(`Total Deductions: ${formatCurrency(payslip.totalDeductions || 0)}`);
		doc.fontSize(14).text(`Net Salary: ${formatCurrency(payslip.netSalary || 0)}`, { underline: true });
		doc.end();
	});
};

export { generatePayslipPdf };
