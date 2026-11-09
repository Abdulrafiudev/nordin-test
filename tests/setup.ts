import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./server";

vi.mock("server-only", () => ({}));
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
afterEach(() => { cleanup(); server.resetHandlers(); vi.useRealTimers(); });
afterAll(() => server.close());
