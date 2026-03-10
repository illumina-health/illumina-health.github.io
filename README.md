# Illumina Health Lab — Static Website

A minimalist, multi-page academic research website for the Illumina Health Lab — an interdisciplinary initiative spanning **Harvard Medical School**, **Rutgers Ernest Mario School of Pharmacy**, and **Duke University**.

Built with HTML, CSS, and vanilla JavaScript. No frameworks or build tools required.

## Folder Structure

```
project-root/
│
├── index.html                          ← Home (hero, 3D cubes, research pillars)
├── pages/
│   ├── people.html                     ← Team members with institutional affiliations
│   ├── about.html                      ← Founding story, mission, values
│   └── research-publications.html      ← Research themes, projects, publications
│
├── assets/
│   ├── css/
│   │   └── main.css                    ← All styles, CSS variables, responsive breakpoints
│   ├── js/
│   │   └── main.js                     ← Shared navbar/footer, 3D cubes, parallax, reveal
│   ├── images/
│   │   ├── logo-placeholder.png        ← Replace with the Illumina Health Lab logo
│   │   └── placeholders/              ← Team photos and project images
│   └── icons/                          ← Favicon or icon assets
│
├── LICENSE
└── README.md
```

## Preview Locally

Open `index.html` directly in a browser, or use a local server:

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# VS Code — use the Live Server extension
```

## Replacing Placeholders

| Placeholder | Location | How to Replace |
|---|---|---|
| **Logo** | `assets/images/logo-placeholder.png` | Replace with actual logo (preserves navbar + hero references) |
| **Team photos** | `.people-card__photo` divs | Replace initials with `<img>` tag inside the div |
| **Project images** | `.img-placeholder` divs | Replace with `<img>` pointing to `assets/images/placeholders/` |
| **Publication links** | `[Forthcoming]` anchors | Update `href="#"` with DOIs or paper URLs |
| **Contact email** | Footer | Search for `contact@illuminahealthlab.org` |
| **Bios** | People page | Replace placeholder paragraphs with real biographical content |

## Deploy to a Static Host

No build step required. Upload the entire folder as-is.

- **GitHub Pages**: Push to repo → Settings → Pages → select branch and root `/`
- **Netlify**: Drag-and-drop or connect GitHub for CI/CD
- **Vercel**: Import repo, set framework to "Other", output directory `.`

## Typography

- **Headings**: Merriweather (Google Fonts, loaded via CSS `@import`)
- **Body**: Source Sans 3 (Google Fonts)

## Color Palette

| Variable | Hex | Usage |
|---|---|---|
| `--white` | `#FFFFFF` | Background base |
| `--light-peach` | `#FFD7B5` | Light section backgrounds |
| `--soft-apricot` | `#FFB38A` | Accent highlights |
| `--warm-orange` | `#FF9248` | Gradient midtone |
| `--vivid-orange` | `#FF6700` | Primary accent |

## Technical Notes

- **Shared layout**: Navbar and footer injected by `main.js` — no markup duplication across pages
- **Path resolution**: `data-depth` attribute on `<html>` controls relative path prefix
- **Active nav**: `data-page` attribute highlights the current page link
- **3D cubes**: CSS `transform-style: preserve-3d` + keyframe animations, spawned by JS
- **Parallax**: Scroll-responsive hero background layer via `requestAnimationFrame`
- **Entry animations**: CSS `hero-enter` keyframes on load, `IntersectionObserver` for scroll reveals
- **Logo fallback**: `onerror` handler hides broken image gracefully