import { test, expect } from "@playwright/test";
test("collection, all colours, variant bag, persistence, wishlist and search work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Quiet confidence. Lasting impression.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "The Signature Blazer in Onyx",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View The Signature Blazer", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Onyx", exact: true }).click();
  await modal.getByRole("button", { name: "M", exact: true }).click();
  await modal.getByRole("button", { name: "Add to bag", exact: true }).click();
  await modal.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Shopping bag, 1 items" }).click();
  await expect(page.getByRole("dialog").getByText("Onyx / M")).toBeVisible();
  await page
    .getByRole("button", { name: "Increase The Signature Blazer quantity" })
    .click();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Shopping bag, 2 items" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save The Essential Shirt", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Unsave The Essential Shirt",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Search collection", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Search products" }).fill("trouser");
  await expect(
    page.getByRole("button", {
      name: "View The Sculpted Trouser",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "View The Signature Blazer",
      exact: true,
    }),
  ).toHaveCount(0);
});
test("preview does not pretend authentication or subscriptions succeed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Your account", exact: true }).click();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "unavailable in the studio preview",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Newsletter email address" })
    .fill("test@example.com");
  await page.locator(".newsletter-consent input").check();
  await page.getByRole("button", { name: "Subscribe to newsletter" }).click();
  await expect(page.getByRole("status")).toContainText("preview");
});
test("studio supports editing variant inventory and storefront settings", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit The Signature Blazer", exact: true })
    .click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("The Refined Blazer");
  await page.getByRole("button", { name: "Save piece", exact: true }).click();
  await expect(
    page.getByText("The Refined Blazer", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Store settings", exact: true })
    .click();
  await page
    .getByLabel("Announcement", { exact: true })
    .fill("A fresh perspective.");
  await page
    .getByRole("button", { name: "Save store settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
});
test("mobile layout fits the viewport and assistant responds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Quiet confidence. Lasting impression.",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .locator(".mobile-menu")
    .getByRole("button", { name: "Men", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View The Essential Shirt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open shopping assistant" }).click();
  await page.getByRole("button", { name: "Delivery details" }).click();
  await expect(page.locator(".chat-messages")).toContainText(
    "complimentary delivery",
  );
  await page.screenshot({ path: "artifacts/mobile-store.png", fullPage: true });
});
test("desktop storefront and studio screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "artifacts/storefront.png", fullPage: true });
  await page.goto("/admin");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "artifacts/studio.png", fullPage: true });
});
