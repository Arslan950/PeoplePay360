import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthCheckRouter from "./routes/healthCheck.route.js";
import authRouter from "./features/auth/auth.routes.js";
import employeeRouter from "./features/employees/employee.routes.js";
import contractRouter from "./features/contracts/contract.routes.js";
import scheduleRouter from "./features/schedules/schedule.routes.js";
import userRouter from "./features/users/user.routes.js";
import attendanceRouter from "./features/attendance/attendance.routes.js";
import timeoffRouter from "./features/timeoff/timeoff.routes.js";
import payrollRouter from "./features/payroll/payroll.routes.js";
import dashboardRouter from "./features/dashboard/dashboard.routes.js";
import { ApiError } from "./utils/api-error.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(cors({
    origin: process.env.CORS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(cookieParser());
app.use("/api/healthcheck", healthCheckRouter);
app.use("/api/auth", authRouter);
app.use("/api/employees", employeeRouter);
app.use("/api/contracts", contractRouter);
app.use("/api/schedules", scheduleRouter);
app.use("/api/users", userRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/timeoff", timeoffRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res
            .status(err.statusCode)
            .json({
                success: err.success,
                message: err.message,
                errors: err.errors,
                data: err.data
            })
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
});

app.get("/", (req, res) => {
    res.send("hello world")
});

export default app; 
