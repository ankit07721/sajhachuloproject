const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const Subscription = require("../models/Subscription");
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
        success_url: `${process.env.BACKEND_URL}/api/payment/verify/esewa/${orderId}`,
        failure_url: `${process.env.FRONTEND_URL}/orders`,
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

// ── POST /api/payment/initiate-subscription ─────────────────────────────────
router.post("/initiate-subscription", authenticateToken, async (req, res) => {
  try {
    const { subscriptionId, method } = req.body;

    if (!subscriptionId || !method) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const sub = await Subscription.findById(subscriptionId).populate("user");
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const amount = sub.totalAmount;

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
        success_url: `${process.env.BACKEND_URL}/api/payment/verify/esewa-sub/${subscriptionId}`,
        failure_url: `${process.env.FRONTEND_URL}/my-subscription`,
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
        esewaConfig: { ...esewaConfig, signature },
        paymentActionUrl:
          process.env.ESEWA_PAYMENT_URL ||
          "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      });
    } else if (method === "khalti") {
      const khaltiConfig = {
        return_url: `${process.env.BACKEND_URL}/api/payment/verify-sub?method=khalti&subscriptionId=${subscriptionId}`,
        website_url: process.env.FRONTEND_URL || process.env.BACKEND_URL,
        amount: Math.round(amount * 100),
        purchase_order_id: subscriptionId,
        purchase_order_name: `Tiffin Plan: ${sub.planName}`,
        customer_info: {
          name: `${sub.user.firstName} ${sub.user.lastName}`,
          email: sub.user.email,
          phone: sub.user.phone,
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
      "Sub Payment Initiation Error:",
      error.response?.data || error.message,
    );
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
  }
});

// ── GET /api/payment/verify/esewa-sub/:subscriptionId ────────────────────────
router.get("/verify/esewa-sub/:subscriptionId", async (req, res) => {
  const { subscriptionId } = req.params;
  const { data } = req.query;

  try {
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).send("Subscription not found");

    if (data) {
      const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
      if (decoded.status !== "COMPLETE") {
        return res.redirect(
          `${process.env.FRONTEND_URL}/my-subscription?status=failed`,
        );
      }

      // Verify with eSewa
      const verifyUrl = `${process.env.ESEWA_VERIFY_URL || "https://rc-epay.esewa.com.np/api/epay/transaction/status/"}?product_code=${process.env.ESEWA_MERCHANT_CODE || "EPAYTEST"}&total_amount=${decoded.total_amount}&transaction_uuid=${decoded.transaction_uuid}`;
      const verifyRes = await axios.get(verifyUrl);

      if (
        verifyRes.data.status === "COMPLETE" &&
        Number(verifyRes.data.total_amount) === sub.totalAmount
      ) {
        sub.paymentStatus = "paid";
        sub.status = "active"; // Force active on payment
        await sub.save();
        return res.redirect(
          `${process.env.FRONTEND_URL}/my-subscription?status=success`,
        );
      }
    }
    return res.redirect(
      `${process.env.FRONTEND_URL}/my-subscription?status=failed`,
    );
  } catch (error) {
    console.error("eSewa Sub Verify Error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/my-subscription?status=error`,
    );
  }
});

// ── GET /api/payment/verify-sub ──────────────────────────────────────────────
router.get("/verify-sub", async (req, res) => {
  const { method, subscriptionId, pidx } = req.query;

  try {
    const sub = await Subscription.findById(subscriptionId);
    if (!sub) return res.status(404).send("Subscription not found");

    if (method === "khalti" && pidx) {
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
        verifyRes.data.total_amount / 100 === sub.totalAmount
      ) {
        sub.paymentStatus = "paid";
        sub.status = "active";
        await sub.save();
        return res.redirect(
          `${process.env.FRONTEND_URL}/my-subscription?status=success`,
        );
      }
    }
    return res.redirect(
      `${process.env.FRONTEND_URL}/my-subscription?status=failed`,
    );
  } catch (error) {
    console.error("Payment Sub Verification Error:", error.message);
    return res.redirect(
      `${process.env.FRONTEND_URL}/my-subscription?status=error`,
    );
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

      // SECURITY: Verify amount matches
      const verifiedAmount = Number(verifyRes.data.total_amount);
      if (verifiedAmount !== order.pricing.total) {
        console.error("Amount mismatch:", {
          expected: order.pricing.total,
          received: verifiedAmount,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=amount_mismatch`,
        );
      }

      // SECURITY: Check if transaction UUID was already used (fraud prevention)
      const existingPaymentWithTxn = await Order.findOne({
        "paymentDetails.esewaTransactionUuid": decoded.transaction_uuid,
        _id: { $ne: orderId },
      });

      if (existingPaymentWithTxn) {
        console.error("FRAUD ALERT: eSewa transaction UUID already used:", {
          transaction_uuid: decoded.transaction_uuid,
          originalOrder: existingPaymentWithTxn._id,
          attemptedOrder: orderId,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=already_used`,
        );
      }

      if (
        verifyRes.data.status === "COMPLETE" &&
        verifiedAmount === order.pricing.total
      ) {
        order.paymentStatus = "paid";
        order.paymentDetails.esewaTransactionUuid = decoded.transaction_uuid;
        order.paymentDetails.esewaRefId = decoded.ref_id;
        await order.save();

        // REMOVED: Cart is no longer cleared here to meet user requirement
        // const Cart = require("../models/Cart");
        // await Cart.findOneAndUpdate({ user: order.customer }, { items: [] });

        return res.redirect(
          `${process.env.FRONTEND_URL}/orders?status=success&orderId=${orderId}`,
        );
      }
    }

    return res.redirect(`${process.env.FRONTEND_URL}/orders?status=failed`);
  } catch (error) {
    console.error("eSewa Verification Error:", error.message);
    return res.redirect(`${process.env.FRONTEND_URL}/orders?status=error`);
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
        return res.redirect(`${process.env.FRONTEND_URL}/orders?status=failed`);
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
          `${process.env.FRONTEND_URL}/orders?status=success&orderId=${orderId}`,
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

      // SECURITY: Verify the pidx belongs to this payment (Khalti returns purchase_order_id)
      if (
        verifyRes.data.purchase_order_id &&
        verifyRes.data.purchase_order_id !== orderId.toString()
      ) {
        console.error("Payment ID mismatch:", {
          expected: orderId,
          received: verifyRes.data.purchase_order_id,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=id_mismatch`,
        );
      }

      // SECURITY: Verify amount matches (Khalti returns amount in paisa)
      const verifiedAmount = verifyRes.data.total_amount / 100;
      if (Math.abs(verifiedAmount - order.pricing.total) > 0.01) {
        console.error("Amount mismatch:", {
          expected: order.pricing.total,
          received: verifiedAmount,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=amount_mismatch`,
        );
      }

      // SECURITY: Check if pidx was already used (fraud prevention)
      const existingPaymentWithPidx = await Order.findOne({
        "paymentDetails.khaltiPidx": pidx,
        _id: { $ne: orderId },
      });

      if (existingPaymentWithPidx) {
        console.error("FRAUD ALERT: Khalti pidx already used:", {
          pidx: pidx,
          originalOrder: existingPaymentWithPidx._id,
          attemptedOrder: orderId,
        });
        return res.redirect(
          `${process.env.FRONTEND_URL}/order-history?status=already_used`,
        );
      }

      if (
        verifyRes.data.status === "Completed" &&
        verifiedAmount === order.pricing.total
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
          `${process.env.FRONTEND_URL}/orders?status=success&orderId=${orderId}`,
        );
      }
    }

    return res.redirect(`${process.env.FRONTEND_URL}/orders?status=failed`);
  } catch (error) {
    console.error(
      "Payment Verification Error:",
      error.response?.data || error.message,
    );
    return res.redirect(`${process.env.FRONTEND_URL}/orders?status=error`);
  }
});

module.exports = router;
