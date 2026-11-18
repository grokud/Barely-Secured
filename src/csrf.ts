import type { RequestHandler } from "express";
import { sendErrorPage } from "./errors.ts";
import { timingSafeEqual } from "node:crypto";

export function validateRequestOrigin(appOrigin: string): RequestHandler {
  const handleRequestOrigin: RequestHandler = (req, res, next) => {
    if (req.method !== "PUT") {
      next();
      return;
    }

    const origin = req.get("origin");
    const refererHeader = req.get("referer");

    if (origin) {
      if (origin === appOrigin) {
        next();
        return;
      }

      sendErrorPage(
        res,
        403,
        "Forbidden",
        "The request did not come from the app.",
      );
      return;
    }

    if (refererHeader) {
      let refererOrigin: string | undefined;
      try {
        refererOrigin = new URL(refererHeader).origin;
      } catch {
        refererOrigin = undefined;
      }

      if (refererOrigin === appOrigin) {
        next();
        return;
      }
    }

    sendErrorPage(
      res,
      403,
      "Forbidden",
      "The request did not come from the app.",
    );
  };

  return handleRequestOrigin;
}

export function csrfTokensMatch(expected: string, actual: unknown): boolean {
  if (typeof actual !== "string") return false;
  const bufferActual = Buffer.from(actual, "hex");
  const bufferExpected = Buffer.from(expected, "hex");
  if (bufferActual.length !== bufferExpected.length) return false;
  return timingSafeEqual(bufferActual, bufferExpected);
}
