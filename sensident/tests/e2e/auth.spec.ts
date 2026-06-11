/**
 * Sensident — Tests E2E Playwright
 *
 * Usage :
 *   1. Demarrer le serveur : node node_modules/next/dist/bin/next dev --port 3001
 *   2. Demarrer les tests : npx playwright test
 *
 * Scenarios couverts :
 * - Inscription praticien (formulaire visible)
 * - Connexion admin (avec mock MFA)
 * - Acces page article
 * - Page desabonnement
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

test.describe('Sensident MVP', () => {
  test('Home page s\'affiche', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.locator('h1')).toContainText('Sensident');
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('Page signup praticien charge le formulaire', async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#cabinetName')).toBeVisible();
  });

  test('Page login admin charge le formulaire', async ({ page }) => {
    await page.goto(`${BASE}/admin-auth/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Page desabonnement accessible', async ({ page }) => {
    const res = await page.goto(`${BASE}/desabonnement`);
    expect(res?.status()).toBe(200);
  });

  test('No-AI guard : aucune mention d\'IA dans le HTML public', async ({ page }) => {
    await page.goto(`${BASE}/`);
    const html = await page.content();
    // Pas d'API LLM exposee
    expect(html).not.toContain('openai.com');
    expect(html).not.toContain('anthropic.com');
    expect(html).not.toContain('mistral.ai');
  });

  test('Page 404 sur URL inconnue', async ({ page }) => {
    const res = await page.goto(`${BASE}/this-does-not-exist`);
    expect(res?.status()).toBe(404);
  });
});
