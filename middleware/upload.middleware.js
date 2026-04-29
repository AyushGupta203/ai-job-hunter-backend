import multer from "multer";
import multerS3 from "multer-s3";
import s3 from "../config/s3.js";

// S3 storage
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME,

  contentType: multerS3.AUTO_CONTENT_TYPE,

  key: (req, file, cb) => {
    // Safety check
    if (!req.user || !req.user.id) {
      return cb(new Error("User not authenticated"));
    }

    const fileName = `resumes/${req.user.id}_${Date.now()}.pdf`;
    cb(null, fileName);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Multer config
export const upload = multer({
  storage: s3Storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});