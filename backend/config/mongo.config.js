const mongoose = require("mongoose")


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log(`MongoDB Connected to ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error(`Failed to connect to MongoDB: ${error.message}`)
        process.exit(1);
    }
}

module.exports = connectDB;