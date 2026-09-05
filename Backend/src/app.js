import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthCheckRouter from "./routes/healthCheck.route.js";
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

app.use(cookieParser());
app.use("/api/healthcheck", healthCheckRouter);

app.get("/", (req, res) => {
    res.send("hello world")
});

export default app; 