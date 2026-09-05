import PDFDocument from "pdfkit";

const generatePayslipPdfBuffer = async ({ employee, period, contractWage, lines, netSalary }) => {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 40 });
		const chunks = [];

		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		doc.fontSize(20).text("Payslip", { align: "center" });
		doc.moveDown();
		doc.fontSize(12).text(`Employee: ${employee?.name || "Unknown Employee"}`);
		doc.text(`Period: ${period?.startDate ? new Date(period.startDate).toLocaleDateString() : "-"} to ${period?.endDate ? new Date(period.endDate).toLocaleDateString() : "-"}`);
		doc.text(`Contract wage: ${Number(contractWage || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		doc.moveDown();
		doc.fontSize(14).text("Salary computation");
		const categories = ["basic", "allowance", "gross", "deduction", "net"];
		for (const category of categories) {
			const categoryLines = (lines || []).filter((line) => line.category === category);
			if (!categoryLines.length) continue;
			doc.moveDown(0.4).fontSize(11).fillColor("#176453").text(category.toUpperCase());
			doc.fillColor("black");
			for (const line of categoryLines) {
				doc.text(`${line.name} (${line.code}) — ${Number(line.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
			}
		}

		doc.moveDown();
		doc.fontSize(14).fillColor("#176453").text(`Net salary: ${Number(netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
		doc.end();
	});
};

export { generatePayslipPdfBuffer };
