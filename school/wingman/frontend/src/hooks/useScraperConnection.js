import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

const POLL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes, then fall back to the manual "Check now" button

// Shared by every browser-login integration (Outlook, Canvas) so logging in behaves the same
// way everywhere it appears: click once, then Wingman polls in the background and updates
// itself the moment the sign-in window succeeds - no separate "check connection" click needed.
export function useScraperConnection(apiPrefix) {
  const [status, setStatus] = useState(null);
  const [loginStarted, setLoginStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef(null);
  const inFlightRef = useRef(false);
  const attemptsRef = useRef(0);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setChecking(false);
  }

  function checkNow() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    api
      .get(`${apiPrefix}/status`)
      .then((s) => {
        setStatus(s);
        if (s.connected) stopPolling();
      })
      .catch(() => {})
      .finally(() => {
        inFlightRef.current = false;
      });
  }

  function startPolling() {
    stopPolling();
    setChecking(true);
    attemptsRef.current = 0;
    pollRef.current = setInterval(() => {
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_POLLS) {
        stopPolling();
        return;
      }
      checkNow();
    }, POLL_MS);
  }

  useEffect(() => {
    checkNow();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPrefix]);

  async function login() {
    await api.post(`${apiPrefix}/login`, {});
    setLoginStarted(true);
    startPolling();
  }

  return { status, loginStarted, checking, login, checkNow };
}
