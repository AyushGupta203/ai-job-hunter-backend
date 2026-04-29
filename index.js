import "dotenv/config";
import app from "./server/app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

// Start server only after DB connects
const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Failed to connect to DB:", error.message);
    process.exit(1); // stop app if DB fails
  }
};

startServer();