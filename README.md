# MRZ Tools — Mehrdad32

Browser-only MRZ Parser, Generator and Check Digit Lab based on ICAO Doc 9303.

**Target URL:** https://mrz.mehrdad32.ir/

## Features
- Parse TD1 (3×30), TD2 (2×36), TD3 (2×44) MRZ formats.
- Validate number, date, optional-data and composite check digits (weighted 7/3/1).
- Extract names, issuing country, nationality, dates, gender and optional data.
- Show ISO alpha-3 country names in Persian and country flag emoji.
- Convert Gregorian dates to Jalali using the built-in Intl Persian calendar. MRZ stores only the final two year digits, so the century is inferred.
- Generate synthetic example MRZ lines with correct checksums.
- Preview an educational card using an optional local photo and conspicuous permanent SAMPLE / NOT VALID watermark.
- Separate check digit calculator, JSON/TXT export and copy-to-clipboard.

## Security / scope
**This is a developer tool, not an identity verification system.** Correct MRZ checksums do not establish identity, authentic document issuance, chip authentication or PKI validity.

All MRZ data and pictures are processed in the browser; no upload or API. Do not paste sensitive real identity information unless authorized. The demo document has no government emblems and cannot be used as proof of identity or for travel.

The transliteration of real names is not automatic; names must be Latin. MRV-A and MRV-B are outside v1 scope.

## OCR-B font
A genuine OCR-B typeface from the Raisty OCR-B project (SIL OFL-1.1) is downloaded from the pinned upstream commit during production builds and self-hosted at /fonts/OCR-B.ttf, along with its license in /fonts/OFL.txt. Upstream source: https://github.com/jaycee723/ocr-b . The site does not make third-party requests to load the font. It remains separately licensed from this MIT application.

## Development
Node.js 22+. Run: npm install; npm test; npm run build; npm run dev.

## Cloudflare Pages
Repository: Mehrdad32/MrzTools
Branch: main
Framework: React (Vite)
Root: repository root (leave empty)
Build command: npm run build
Output directory: dist
Optional variable: NODE_VERSION=22.23.4
Custom domain: mrz.mehrdad32.ir

License: MIT (see LICENSE).
