const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const { authenticateToken } = require("../middleware/auth");
const { generateEsewaSignature } = require("../utils/payment");
const axios = require("axios");

const router = express.Router();

// ── Environment Variables Check ──────────────────────────────────────────────
const validateEnv = () => {
  const vars = [
    "BASE_URL",
    "ESEWA_MERCHANT_CODE",
    "ESEWA_SECRET_KEY",
    "ESEWA_VERIFY_URL",
    "KHALTI_SECRET_KEY",
    "KHALTI_VERIFY_URL",
    "KHALTI_INITIATE_URL",
  ];
  vars.forEach((v) => {
    if (!process.env[v]) {
      console.warn(`Warning: Missing environment variable ${v}`);
    }
  });
};

validateEnv();

// ── POST /api/payment/initiate ───────────────────────────────────────────────
// Initiates payment and returns necessary config or URL
router.post("/initiate", authenticateToken, async (req, res) => {
  try {
    const { orderId, method } = req.body;

    if (!orderId || !method) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const order = await Order.findById(orderId).populate("customer");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Amount validation
    const amount = order.pricing.total;

    if (method === "esewa") {
      const transactionUuid = `${Date.now()}-${uuidv4()}`;

      const esewaConfig = {
        amount: amount.toString(),
        tax_amount: "0",
        total_amount: amount.toString(),
        transaction_uuid: transactionUuid,
        product_code: process.env.ESEWA_MERCHANT_CODE || "EPAYTEST",
        product_service_charge: "0",
        product_delivery_charge: "0",
        success_url: `${process.env.BASE_URL}/api/payment/verify/esewa/${orderId}`,
        failure_url: `${process.env.FRONTEND_URL || process.env.BASE_URL}/order-history`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
      };

      const signatureString = `total_amount=${esewaConfig.total_amount},transaction_uuid=${esewaConfig.transaction_uuid},product_code=${esewaConfig.product_code}`;
      const signature = generateEsewaSignature(
        process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q",
        signatureString,
      );

      return res.json({
        success: true,
        method: "esewa",
        esewaConfig: {
          ...esewaConfig,
          signature,
        },
        paymentActionUrl:
          process.env.ESEWA_PAYMENT_URL ||
          "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      });
    } else if (method === "khalti") {
      const khaltiConfig = {
        return_url: `${process.env.BASE_URL}/api/payment/verify?method=khalti&orderId=${orderId}`,
        website_url: process.env.FRONTEND_URL || process.env.BASE_URL,
        amount: Math.round(amount * 100), // Khalti expects paisa
        purchase_order_id: orderId,
        purchase_order_name: `Order #${order.orderNumber}`,
        customer_info: {
          name: `${order.customer.firstName} ${order.customer.lastName}`,
          email: order.customer.email,
          phone: order.customer.phone,
        },
      };

      const khaltiInitiateUrl =
        process.env.KHALTI_INITIATE_URL ||
        "https://a.khalti.com/api/v2/epayment/initiate/";

      const response = await axios.post(khaltiInitiateUrl, khaltiConfig, {
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data && response.data.payment_url) {
        return res.json({
          success: true,
          method: "khalti",
          paymentUrl: response.data.payment_url,
          pidx: response.data.pidx,
        });
      } else {
        throw new Error("Khalti initiation failed");
      }
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid payment method" });
  } catch (error) {
    console.error(
      "Payment Initiation Error:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      message: "Internal server error initiating payment",
      error: error.message,
    });
  }
});

// ── GET /api/payment/verify ──────────────────────────────────────────────────
// Callback endpoint to verify payment
// eSewa specific verification route to avoid query param issues
router.get("/verify/esewa/:orderId", async (req, res) => {
  const { orderId } = req.params;
  const { data } = req.query;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (data) {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

      if (decoded.status !== "COMPLETE") {
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=failed`,
        );
      }

      const verifyUrl = `${process.env.ESEWA_VERIFY_URL || "https://rc-epay.esewa.com.np/api/epay/transaction/status/"}?product_code=${process.env.ESEWA_MERCHANT_CODE || "EPAYTEST"}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`;

      const verifyRes = await axios.get(verifyUrl);

      if (
        verifyRes.data.status === "COMPLETE" &&
        Number(verifyRes.data.total_amount) === order.pricing.total
      ) {
        order.paymentStatus = "paid";
        order.paymentDetails.esewaTransactionUuid = decoded.transaction_uuid;
        order.paymentDetails.esewaRefId = decoded.ref_id;
        await order.save();

        // REMOVED: Cart is no longer cleared here to meet user requirement
        // const Cart = require("../models/Cart");
        // await Cart.findOneAndUpdate({ user: order.customer }, { items: [] });

        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=success&orderId=${orderId}`,
        );
      }
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/order-history?status=failed`,
    );
  } catch (error) {
    console.error("eSewa Verification Error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/order-history?status=error`,
    );
  }
});

router.get("/verify", async (req, res) => {
  const { method, orderId, data, pidx } = req.query;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send("Order not found");
    }

    if (method === "esewa" && data) {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));

      if (decoded.status !== "COMPLETE") {
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=failed`,
        );
      }

      // Verify with eSewa
      const verifyUrl = `${process.env.ESEWA_VERIFY_URL || "https://rc-epay.esewa.com.np/api/epay/transaction/status/"}?product_code=${process.env.ESEWA_MERCHANT_CODE || "EPAYTEST"}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`;

      const verifyRes = await axios.get(verifyUrl);

      if (
        verifyRes.data.status === "COMPLETE" &&
        Number(verifyRes.data.total_amount) === order.pricing.total
      ) {
        // Update Order
        order.paymentStatus = "paid";
        order.paymentDetails.esewaTransactionUuid = decoded.transaction_uuid;
        order.paymentDetails.esewaRefId = decoded.ref_id;
        await order.save();

        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=success&orderId=${orderId}`,
        );
      }
    } else if (method === "khalti" && pidx) {
      // Verify with Khalti
      const verifyUrl =
        process.env.KHALTI_VERIFY_URL ||
        "https://a.khalti.com/api/v2/epayment/lookup/";

      const verifyRes = await axios.post(
        verifyUrl,
        { pidx },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (
        verifyRes.data.status === "Completed" &&
        verifyRes.data.total_amount / 100 === order.pricing.total
      ) {
        order.paymentStatus = "paid";
        order.paymentDetails.khaltiPidx = pidx;
        order.paymentDetails.khaltiTransactionId =
          verifyRes.data.transaction_id;
        await order.save();

        // REMOVED: Cart is no longer cleared here to meet user requirement
        // const Cart = require("../models/Cart");
        // await Cart.findOneAndUpdate({ user: order.customer }, { items: [] });

        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=success&orderId=${orderId}`,
        );
      }
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/order-history?status=failed`,
    );
  } catch (error) {
    console.error(
      "Payment Verification Error:",
      error.response?.data || error.message,
    );
    return res.redirect(
      `${process.env.FRONTEND_URL}/order-history?status=error`,
    );
  }
});

module.exports = router;
