const express = require("express");
const { body, validationResult } = require("express-validator");
const { sendContactFormEmail } = require("../utils/email");
const router = express.Router();

router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("A valid email is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("message").notEmpty().withMessage("Message is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      const { name, email, subject, message } = req.body;
      await sendContactFormEmail({ name, email, subject, message });
      res
        .status(200)
        .json({
          success: true,
          message: "Your message has been sent successfully!",
        });
    } catch (error) {
      console.error("Contact form submission error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to send message." });
    }
  }
);

module.exports = router;
