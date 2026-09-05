import dotenv from "dotenv"
import "dotenv/config"
import app from "./app.js"
import connectDB from "./db/server.js"

const port = process.env.PORT ;

connectDB()
    .then(() => app.listen(port, () => console.log(`http://localhost:${port}`)))
    .catch((error) => {
        console.error("Unable to start server", error.message);
        process.exit(1);
    });