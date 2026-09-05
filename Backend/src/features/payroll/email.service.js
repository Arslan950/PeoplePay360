import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	jsonTransport: true,
});

const sendPayslipEmail = async ({ employeeName, employeeEmail, period, pdfBuffer }) => {
	const result = await transporter.sendMail({
		from: process.env.EMAIL_FROM || "noreply@peoplepay360.local",
		to: employeeEmail,
		subject: `Payslip for ${period?.startDate ? new Date(period.startDate).toLocaleDateString() : "current period"}`,
		text: `Hello ${employeeName},\n\nYour payslip is attached.`,
		attachments: [{
			filename: `payslip-${employeeName?.replace(/\s+/g, "-").toLowerCase() || "employee"}.pdf`,
			content: pdfBuffer,
			contentType: "application/pdf",
		}],
	});
	return result;
};

export { sendPayslipEmail };
