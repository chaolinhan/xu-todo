import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { expect, it, vi } from "vitest";
function worker(base = "/xu-todo/") {
  const handlers = {};
  const storage = /* @__PURE__ */ new Map();
  const origin = "https://example.github.io";
  const prefix = `xiaoxu-shell:${base}:`;
  const name = `${prefix}test-version`;
  const key = (request2) => typeof request2 === "string" ? request2 : new URL(request2.url).pathname;
  const cacheFor = (cacheName) => {
    if (!storage.has(cacheName)) storage.set(cacheName, /* @__PURE__ */ new Map());
    const values = storage.get(cacheName);
    return { match: vi.fn(async (request2) => values.get(key(request2))), addAll: vi.fn(async (urls) => {
      urls.forEach((url) => values.set(url, `cached:${url}`));
    }) };
  };
  const caches = { open: vi.fn(async (cacheName) => cacheFor(cacheName)), keys: vi.fn(async () => [...storage.keys()]), delete: vi.fn(async (cacheName) => storage.delete(cacheName)) };
  const fetch = vi.fn(async (_request) => ({ ok: true, body: "network" }));
  const self = { registration: { scope: `${origin}${base}` }, location: { origin }, addEventListener: (type, handler) => {
    handlers[type] = handler;
  }, skipWaiting: vi.fn(), clients: { claim: vi.fn(), matchAll: vi.fn(async () => []), openWindow: vi.fn() } };
  const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8").replace("__CACHE_VERSION__", "test-version").replace("/* __ASSETS__ */ []", JSON.stringify([`${base}index.html`, `${base}assets/app.js`]));
  new Script(source).runInNewContext({ self, caches, fetch, URL, Set });
  const lifecycle = async (type) => {
    let work;
    handlers[type]({ waitUntil: (promise) => {
      work = promise;
    } });
    await work;
  };
  const request = (path, mode = "navigate") => {
    let response;
    handlers.fetch({ request: { url: `${origin}${path}`, method: "GET", mode }, respondWith: (promise) => {
      response = promise;
    } });
    return response;
  };
  return { handlers, storage, caches, fetch, self, lifecycle, request, prefix, name };
}
it("precaches assets and loads an offline shell at the project base", async () => {
  const w = worker();
  await w.lifecycle("install");
  w.fetch.mockRejectedValue(new Error("offline"));
  expect(await w.request("/xu-todo/?action=add")).toBe("cached:/xu-todo/index.html");
  expect(await w.request("/xu-todo/assets/app.js", "cors")).toBe("cached:/xu-todo/assets/app.js");
});
it("uses the current network navigation when online so an update does not reuse stale HTML", async () => {
  const w = worker();
  await w.lifecycle("install");
  expect(await w.request("/xu-todo/")).toMatchObject({ body: "network" });
});
it("does not intercept sibling projects or delete their caches", async () => {
  const w = worker();
  w.storage.set("xiaoxu-shell:/other/:a", /* @__PURE__ */ new Map());
  for (const version of ["old-a", "old-b", "old-c"]) w.storage.set(`${w.prefix}${version}`, /* @__PURE__ */ new Map());
  await w.lifecycle("install");
  await w.lifecycle("activate");
  expect(w.request("/other/")).toBeUndefined();
  expect(w.storage.has("xiaoxu-shell:/other/:a")).toBe(true);
  expect(w.storage.has(`${w.prefix}old-a`)).toBe(false);
  expect(w.storage.has(`${w.prefix}old-c`)).toBe(true);
  expect(w.storage.has(w.name)).toBe(true);
});
it("lets an older open tab finish loading its assets and preserves the localhost root shell", async () => {
  const w = worker("/");
  await w.lifecycle("install");
  w.storage.set(`${w.prefix}previous`, /* @__PURE__ */ new Map([["/assets/previous.js", "previous-js"]]));
  expect(await w.request("/assets/previous.js", "cors")).toBe("previous-js");
  w.fetch.mockRejectedValue(new Error("server stopped"));
  expect(await w.request("/")).toBe("cached:/index.html");
});
it("opens notification clicks only inside the app scope", async () => {
  const w = worker();
  const siblingFocus = vi.fn(), ownFocus = vi.fn();
  w.self.clients.matchAll.mockResolvedValue([{ url: "https://example.github.io/other/", focus: siblingFocus }, { url: "https://example.github.io/xu-todo/", focus: ownFocus }]);
  let work;
  w.handlers.notificationclick({ notification: { close: vi.fn() }, waitUntil: (p) => {
    work = p;
  } });
  await work;
  expect(ownFocus).toHaveBeenCalledOnce();
  expect(siblingFocus).not.toHaveBeenCalled();
});
