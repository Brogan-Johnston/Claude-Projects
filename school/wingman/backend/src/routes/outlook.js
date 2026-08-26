import { Router } from "express";
import { isConnected, startLogin, fetchRecentEmails, disconnect } from "../services/outlookScrapeService.js";

const router = Router();

router.get("/status", async (req, res, next) => {
  try {
    res.json({ connected: await isConnected() });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    res.status(202).json(await startLogin());
  } catch (err) {
    next(err);
  }
});

router.post("/disconnect", async (req, res, next) => {
  try {
    await disconnect();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
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
