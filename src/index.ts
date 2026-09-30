import { Hono } from "hono";
import { runScheduled } from "./crons";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default {
  fetch: app.fetch,
  scheduled: runScheduled,
} satisfies ExportedHandler<CloudflareBindings>;
