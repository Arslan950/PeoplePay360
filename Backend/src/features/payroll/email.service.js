import nodemailer from "nodemailer";

const buildTransporter = () => {
	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
	if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
		throw new Error("SMTP configuration is incomplete");
	}
	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT),
		secure: Number(SMTP_PORT) === 465,
		auth: { user: SMTP_USER, pass: SMTP_PASS },
	});
};

const sendPayslipEmail = async ({ to, subject, employeeName, pdfBuffer, payslip }) => {
	const transporter = buildTransporter();
	const emailSubject = subject || `Payslip for ${employeeName || "employee"}`;
	await transporter.sendMail({
		from: process.env.SMTP_USER,
		to,
		subject: emailSubject,
		html: `
			<div>
				<h3>Payroll Notification</h3>
				<p>Hello ${employeeName || "there"},</p>
				<p>Your payslip for ${new Date(payslip.period.startDate).toLocaleDateString()} - ${new Date(payslip.period.endDate).toLocaleDateString()} is attached.</p>
				<p>Net salary: $${Number(payslip.netSalary || 0).toFixed(2)}</p>
			</div>
		`,
		attachments: [{
			filename: `payslip-${payslip._id || "download"}.pdf`,
			content: pdfBuffer,
			contentType: "application/pdf",
		}],
	});
};

export { sendPayslipEmail };
