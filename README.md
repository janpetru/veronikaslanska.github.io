# veronikaslanska.cz

Web Salonu Lhotka (Veronika Slánská) – statický Jekyll web na GitHub Pages.

- Veškerý obsah (texty, ceny, kontakty, fotky): [`_data/web.yml`](_data/web.yml)
- Šablona: [`index.html`](index.html), styly: [`style.css`](style.css)
- Editor pro netechnické úpravy: [Pages CMS](https://app.pagescms.org), konfigurace v [`.pages.yml`](.pages.yml)
- Návod k úpravám: [NAVOD.md](NAVOD.md)

## Testy (mobilní zobrazení)

Playwright testy v [tests/](tests/) vyrenderují web stejně jako Jekyll (do `tests/_nahled/`) a proklikají ho na šířkách 320–412 px: přetékání, menu, počet viditelných tlačítek rezervace, obrázky, velikost tlačítek, odkazy.

```bash
cd tests
npm install
npx playwright install chromium   # jen poprvé
npm test
```

Náhled bez testů: `npm run nahled`, pak otevřít `tests/_nahled/index.html`.
