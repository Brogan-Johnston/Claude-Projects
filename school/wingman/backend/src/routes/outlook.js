import { Router } from "express";
import {
  isConfigured,
  isConnected,
  getAuthUrl,
  handleCallback,
  disconnect,
  fetchRecentEmails,
} from "../services/outlookService.js";

const router = Router();

router.get("/status", (req, res) => {
  res.json({ configured: isConfigured(), connected: isConnected() });
});

router.get("/login", async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(400).json({ error: "Outlook app credentials are not set. See backend/.env.example." });
    }
    const url = await getAuthUrl();
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

router.get("/callback", async (req, res, next) => {
  try {
    const { code } = req.query;
    await handleCallback(code);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/settings?outlook=connected`);
  } catch (err) {
    next(err);
  }
});

router.post("/disconnect", (req, res) => {
  disconnect();
  res.status(204).end();
});

router.get("/emails", async (req, res, next) => {
  try {
    const emails = await fetchRecentEmails(Number(req.query.count) || 8);
    res.json(emails);
  } catch (err) {
    next(err);
  }
});

export default router;
