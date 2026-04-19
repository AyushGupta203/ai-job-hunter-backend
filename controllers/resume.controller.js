import { extractText } from "unpdf";
import User from "../models/User.js";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const buffer = new Uint8Array(req.file.buffer);
    const { text } = await extractText(buffer, { mergePages: true });

    if (!text?.trim()) {
      return res.status(400).json({ msg: "Could not extract text from PDF" });
    }

    await User.findByIdAndUpdate(req.user.id, {
      resumeText: text.trim(),
    });

    res.status(200).json({
      msg: "Resume uploaded",
      hasText: true,
    });

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};