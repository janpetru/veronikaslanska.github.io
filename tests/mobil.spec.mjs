import {test, expect} from '@playwright/test';
const REZ = 'a[href*="myfox"]';

// Kolik odkazů na rezervaci je skutečně vidět (v okně, nezakryté, viditelné)
async function visibleRez(page) {
  return page.$$eval(REZ, els => els.filter(el => {
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') return false;
    if (r.bottom <= 0 || r.top >= innerHeight) return false;
    const x = r.left + r.width/2, y = Math.min(Math.max(r.top + r.height/2, 1), innerHeight-1);
    const hit = document.elementFromPoint(x, y);
    return hit && (el === hit || el.contains(hit));
  }).map(el => el.textContent.trim()));
}
async function settle(page){ await page.waitForTimeout(450); }

test.beforeEach(async ({page}) => {
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  page.on('console', m => m.type()==='error' && page.errors.push(m.text()));
  await page.goto('index.html', {waitUntil:'networkidle'});
});

test('žádné vodorovné přetékání ani prvky mimo obrazovku', async ({page}) => {
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect(); if (!r.width) return false;
      if (el.closest('svg.kvet') || el.closest('.menu')) return false;
      return r.right > vw + 1 || r.left < -1;
    }).map(el => el.tagName + '.' + el.className);
    return {sw: document.documentElement.scrollWidth, vw, bad};
  });
  expect(res.sw).toBeLessThanOrEqual(res.vw);
  expect(res.bad).toEqual([]);
});

test('na úvodní obrazovce je rezervace jen jednou', async ({page}) => {
  await settle(page);
  expect(await visibleRez(page)).toHaveLength(1);
});

test('při scrollování je rezervace vidět nejvýš jednou a lišta se objeví', async ({page}) => {
  const H = await page.evaluate(() => document.body.scrollHeight);
  const vh = page.viewportSize().height;
  let barShown = false;
  for (let y = 0; y < H; y += Math.round(vh/3)) {
    await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), y); await settle(page);
    const v = await visibleRez(page);
    expect(v.length, `scroll ${y}px: ${v.join(' | ')}`).toBeLessThanOrEqual(1);
    if (await page.locator('#mobile-bar').evaluate(el => el.getBoundingClientRect().top < innerHeight - 5)) barShown = true;
  }
  expect(barShown).toBe(true);
});

test('menu se otevře, odkazy vedou na sekce a nadpis není schovaný pod hlavičkou', async ({page}) => {
  const links = await page.$$eval('#menu a[href^="#"]', as => as.map(a => a.getAttribute('href')));
  expect(links.length).toBeGreaterThanOrEqual(5);
  for (const href of links) {
    await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
    await expect(page.locator('#menu')).toBeHidden();
    await page.click('.menu-toggle');
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.click(`#menu a[href="${href}"]`);
    await expect(page.locator('#menu')).toBeHidden();
    await page.waitForTimeout(2000); // smooth scroll
    const ok = await page.evaluate(href => {
      const sec = document.querySelector(href);
      const first = sec.querySelector('.kicker, img, h2') || sec;
      const head = document.querySelector('.top').getBoundingClientRect().bottom;
      return {top: Math.round(first.getBoundingClientRect().top), sec: Math.round(sec.getBoundingClientRect().top), head: Math.round(head), vh: innerHeight};
    }, href);
    expect(ok.top, `${href} začátek sekce schovaný pod hlavičkou`).toBeGreaterThanOrEqual(ok.head);
    expect(Math.abs(ok.sec - ok.head), `${href} sekce nezačíná pod hlavičkou`).toBeLessThan(40);
  }
});

test('menu jde zavřít Escapem i druhým klepnutím', async ({page}) => {
  await page.click('.menu-toggle'); await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#menu')).toBeHidden();
  await page.click('.menu-toggle'); await page.click('.menu-toggle');
  await expect(page.locator('#menu')).toBeHidden();
});

test('všechny obrázky se načetly', async ({page}) => {
  await page.evaluate(async () => { for (const i of document.images) { i.loading='eager'; } });
  await page.evaluate(() => scrollTo({top:document.body.scrollHeight,behavior:'instant'})); await page.waitForTimeout(800);
  const broken = await page.$$eval('img', is => is.filter(i => !i.complete || !i.naturalWidth).map(i => i.src));
  expect(broken).toEqual([]);
});

test('tlačítka jsou dost velká na prst (min. 44 px)', async ({page}) => {
  await page.click('.menu-toggle');
  const small = await page.$$eval('.btn, .menu-toggle, #menu a', els => els.filter(el => {
    const r = el.getBoundingClientRect(); return r.width && r.height < 44;
  }).map(el => `${el.textContent.trim()||el.className} ${Math.round(el.getBoundingClientRect().height)}px`));
  expect(small).toEqual([]);
});

test('spodní lišta nezakrývá konec stránky', async ({page}) => {
  await page.evaluate(() => scrollTo({top:document.body.scrollHeight,behavior:'instant'})); await settle(page);
  const r = await page.evaluate(() => ({
    copy: document.querySelector('.foot .copy').getBoundingClientRect().bottom,
    bar: document.querySelector('#mobile-bar').getBoundingClientRect().top,
  }));
  expect(r.copy).toBeLessThanOrEqual(r.bar);
});

test('text se nikde neořezává ani nepřetéká z boxů', async ({page}) => {
  const bad = await page.$$eval('h1,h2,h3,p,li,a,span,strong', els => els.filter(el => {
    if (el.closest('svg')) return false;
    return el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible';
  }).map(el => el.textContent.trim().slice(0,40)));
  const wide = await page.$$eval('.service-text, .price-card, .contact-card, .news, .perk', els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.className));
  expect(bad).toEqual([]); expect(wide).toEqual([]);
});

test('odkazy: telefon, e-mail, externí a kotvy jsou v pořádku', async ({page}) => {
  const r = await page.evaluate(() => {
    const as = [...document.querySelectorAll('a')];
    return {
      tel: [...new Set(as.filter(a => a.href.startsWith('tel:')).map(a => a.getAttribute('href')))],
      mail: as.filter(a => a.href.startsWith('mailto:')).map(a => a.getAttribute('href')),
      extNoBlank: as.filter(a => /^https?:/.test(a.getAttribute('href')) && a.target !== '_blank').map(a => a.href),
      deadAnchors: as.map(a => a.getAttribute('href')).filter(h => h && h.startsWith('#') && h.length > 1 && !document.querySelector(h)),
      empty: as.filter(a => !a.textContent.trim() && !a.getAttribute('aria-label')).map(a => a.outerHTML.slice(0,60)),
    };
  });
  expect(r.tel).toEqual(['tel:+420605168729']);
  expect(r.mail).toEqual(['mailto:slanskaveronika@email.cz']);
  expect(r.extNoBlank).toEqual([]); expect(r.deadAnchors).toEqual([]); expect(r.empty).toEqual([]);
});

test('bez chyb v konzoli', async ({page}) => {
  await page.click('.menu-toggle'); await page.evaluate(() => scrollTo({top:3000,behavior:'instant'})); await settle(page);
  expect(page.errors).toEqual([]);
});
