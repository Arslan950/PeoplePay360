import mongoose from "mongoose"
import dns from "dns"

dns.setServers([
    '1.1.1.1',
    '8.8.8.8'
])

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to DB");
    } catch (error) {
        console.log("❌ Connection Failed",error);
        process.exit(1);
    }
}

export default connectDB ;
