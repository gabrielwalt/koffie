#!/usr/bin/env node

/**
 * Custom Import Runner with CSP bypass
 *
 * Wraps the bulk import logic but adds bypassCSP: true to the browser context
 * to handle sites with strict Content Security Policy headers.
 *
 * Usage:
 *   node tools/importer/run-import.js \
 *     --import-script tools/importer/import-<template>.bundle.js \
 *     --urls tools/importer/urls-<template>.txt
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '/home/node/.claude/plugins/cache/excat-marketplace/excat/2.1.1/skills/excat-content-import/scripts/node_modules/playwright/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPTS_DIR = join(
  '/home/node/.claude/plugins/cache/excat-marketplace/excat/2.1.1/skills/excat-content-import/scripts'
);

const { compileReportsToExcel } = await import(join(SCRIPTS_DIR, 'import-report.js'));

const PAGE_TIMEOUT = 45000;

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      parsed[args[i]] = args[++i];
    }
  }
  return {
    importScript: resolve(parsed['--import-script']),
    urlsFile: resolve(parsed['--urls']),
    outputDir: resolve(process.cwd(), 'content'),
  };
}

function loadUrls(urlFile) {
  return readFileSync(urlFile, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));
}

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function sanitizeDocumentPath(docPath, fallbackUrl) {
  if (!docPath || typeof docPath !== 'string') {
    docPath = new URL(fallbackUrl).pathname || '/';
  }
  let n = docPath.replace(/\\/g, '/');
  if (n.startsWith('/')) n = n.slice(1);
  if (n.endsWith('/')) n = n.slice(0, -1);
  if (n === '') n = 'index';
  return n;
}

async function dismissPopups(page) {
  try {
    const selectors = [
      'button[id*="accept" i]', 'button[class*="accept" i]',
      'button[class*="cookie" i]', 'button[class*="consent" i]',
      '#onetrust-accept-btn-handler', '.cookie-consent-accept',
      'button[aria-label*="close" i]',
    ];
    for (const sel of selectors) {
      const els = await page.$$(sel);
      for (const el of els) {
        if (await el.isVisible().catch(() => false)) {
          await el.click().catch(() => {});
          await page.waitForTimeout(500);
          break;
        }
      }
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  } catch { /* ignore */ }
}

async function processUrl({ context, url, helixImporterScript, importScriptContent, outputDir, index, total }) {
  const label = `[${index}/${total}]`;
  console.log(`${label} Starting ${url}`);

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') console.error(`[Browser] ${text}`);
  });

  try {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
    } catch {
      console.log(`${label} Fallback to domcontentloaded...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
      await page.waitForTimeout(3000);
    }

    await dismissPopups(page);

    // RequireJS makes define/require non-configurable, so delete doesn't work.
    // Override with null so UMD check "function"==typeof define fails and falls through to browser global path.
    await page.evaluate(() => {
      window.__savedDefine = window.define;
      window.__savedRequire = window.require;
      window.define = null;
      window.require = null;
    });

    // Inject helix-importer via addScriptTag (bypasses CSP)
    await page.addScriptTag({ content: helixImporterScript });

    // Restore RequireJS globals
    await page.evaluate(() => {
      window.define = window.__savedDefine;
      window.require = window.__savedRequire;
      delete window.__savedDefine;
      delete window.__savedRequire;
    });

    // Verify WebImporter loaded
    const debugInfo = await page.evaluate(() => {
      return {
        hasWebImporter: typeof window.WebImporter !== 'undefined',
        webImporterType: typeof window.WebImporter,
        webImporterKeys: window.WebImporter ? Object.keys(window.WebImporter).slice(0, 10) : [],
        hasHtml2md: window.WebImporter ? typeof window.WebImporter.html2md : 'N/A',
        hasExports: typeof window.exports !== 'undefined',
        hasModule: typeof window.module !== 'undefined',
        hasDefine: typeof window.define !== 'undefined',
        hasRequire: typeof window.require !== 'undefined',
      };
    });
    console.log(`${label} Debug:`, JSON.stringify(debugInfo));
    if (!debugInfo.hasWebImporter || debugInfo.hasHtml2md !== 'function') {
      throw new Error(`WebImporter not available after injection. Debug: ${JSON.stringify(debugInfo)}`);
    }

    // Inject the import script
    await page.addScriptTag({ content: importScriptContent });

    // Wait for CustomImportScript
    await page.waitForFunction(
      () => typeof window.CustomImportScript !== 'undefined' && window.CustomImportScript?.default,
      { timeout: 10000 }
    );

    const result = await page.evaluate(async (pageUrl) => {
      const config = window.CustomImportScript.default;
      const r = await window.WebImporter.html2md(pageUrl, document, config, {
        toDocx: false,
        toMd: true,
        originalURL: pageUrl,
      });
      r.html = window.WebImporter.md2da(r.md);
      return r;
    }, url);

    if (!result.path || !result.html) {
      throw new Error(`Transform returned invalid result (path: ${typeof result.path}, html: ${typeof result.html})`);
    }

    const relPath = sanitizeDocumentPath(result.path, url);
    const htmlPath = join(outputDir, `${relPath}.plain.html`);
    ensureDir(dirname(htmlPath));
    writeFileSync(htmlPath, result.html, 'utf-8');

    // Write report
    const reportPath = join('tools/importer/reports', `${relPath}.report.json`);
    ensureDir(dirname(reportPath));
    writeFileSync(reportPath, JSON.stringify({
      status: 'success', url, path: relPath,
      timestamp: new Date().toISOString(),
      ...(result.report || {}),
    }, null, 2), 'utf-8');

    console.log(`${label} ✅ Saved ${relPath}`);
    return { success: true, path: relPath };
  } catch (error) {
    console.error(`${label} ❌ Failed for ${url}: ${error.message}`);

    try {
      let fp = new URL(url).pathname.replace(/\/$/, '') || '/index';
      if (fp.startsWith('/')) fp = fp.slice(1);
      if (fp === '') fp = 'index';
      const reportPath = join('tools/importer/reports', `${fp}.report.json`);
      ensureDir(dirname(reportPath));
      writeFileSync(reportPath, JSON.stringify({
        status: 'failed', url, path: fp,
        timestamp: new Date().toISOString(),
        error: error.message,
      }, null, 2), 'utf-8');
    } catch { /* ignore */ }

    return { success: false, error };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  const { importScript, urlsFile, outputDir } = parseArgs();

  if (!existsSync(importScript)) {
    console.error(`Import script not found: ${importScript}`);
    process.exit(1);
  }

  const urls = loadUrls(urlsFile);
  if (urls.length === 0) {
    console.error('No URLs found');
    process.exit(1);
  }

  ensureDir(outputDir);

  const helixImporterPath = join(SCRIPTS_DIR, 'static', 'inject', 'helix-importer.js');
  const helixImporterScript = readFileSync(helixImporterPath, 'utf-8');
  const importScriptContent = readFileSync(importScript, 'utf-8');

  console.log('[Import] Starting:');
  console.log(`  Script: ${importScript}`);
  console.log(`  URLs:   ${urls.length}`);
  console.log('');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    bypassCSP: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });

  let successCount = 0;
  try {
    for (let i = 0; i < urls.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      const result = await processUrl({
        context, url: urls[i], helixImporterScript, importScriptContent,
        outputDir, index: i + 1, total: urls.length,
      });
      if (result.success) successCount++;
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  console.log(`[Import] Done. Success: ${successCount}/${urls.length}, Failed: ${urls.length - successCount}`);
  await compileReportsToExcel(importScript);
}

main().catch(err => {
  console.error('[Import] Fatal:', err);
  process.exit(1);
});
