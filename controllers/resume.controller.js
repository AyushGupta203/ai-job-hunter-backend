import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getDocumentProxy, extractText } from "unpdf";
import s3 from "../config/s3.js";
import User from "../models/User.js";

export const uploadResume = async (req, res) => {
  try {
    // 1. File check
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    // 2. Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    // 3. S3 info — multer-s3 sets both location and key
    const resumeUrl = req.file.location;
    const s3Key = req.file.key;

    if (!s3Key) {
      return res.status(500).json({
        msg: "S3 upload key missing",
        error: "req.file.key is undefined — check multer-s3 config",
      });
    }

    // 4. Fetch PDF buffer from S3 using SDK (works with private buckets)
    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: s3Key,
      })
    );

    // 5. Stream → Buffer → Uint8Array
    const chunks = [];
    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }
    const pdfBuffer = new Uint8Array(Buffer.concat(chunks));

    // 6. Parse PDF text with unpdf (ESM-native, no test-file issues)
    const pdf = await getDocumentProxy(pdfBuffer);
    const { text: rawText } = await extractText(pdf, { mergePages: true });
    const text = rawText?.trim();

    // 7. Validate text
    if (!text || text.length < 20) {
      return res.status(400).json({
        msg: "PDF has no readable text. Make sure it is not a scanned image.",
      });
    }

    // 8. Save to DB
    const updatedUser = await User.findByIdAndUpdate(
  req.user.id,
  { 
    resumeUrl, 
    resumeText: text,
    recommendations: [], 
  },
  { new: true }
);

    if (!updatedUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 9. Success
    return res.status(200).json({
      msg: "Resume uploaded successfully",
      resumeUrl,
      textLength: text.length,
    });

  } catch (err) {
    console.error("Resume Upload Error:", err);
    return res.status(500).json({
      msg: "Server error while processing resume",
      error: err.message,
    });
  }
};