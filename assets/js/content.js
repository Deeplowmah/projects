(function () {
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  async function fetchJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
  }

  function isLocalPreview() {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  }

  const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

  function projectTileHTML(project) {
    const {
      id = "",
      title = "",
      description = "",
      tag = "",
      glyph = "",
      imageAlt = "",
      stack = [],
      demoUrl = "",
      sourceUrl = "",
      detail = null,
    } = project;

    const imageBase = id ? `assets/images/projects/${encodeURIComponent(id)}_img_001` : "";
    const glyphHTML = glyph ? `<span class="glyph">${escapeHtml(glyph)}</span>` : "";

    const media = imageBase
      ? `<img data-project-media data-image-base="${escapeHtml(imageBase)}" data-ext-index="0" alt="${escapeHtml(imageAlt || title)}" loading="lazy" style="display:none" />`
        + `<span class="media-fallback" data-media-fallback hidden>${glyphHTML}</span>`
      : glyphHTML;

    const stackHTML = (stack || []).map((s) => `<span>${escapeHtml(s)}</span>`).join("");

    // Projects with a `detail` block link through to their own page instead of
    // showing Demo/Source buttons here — those live on the detail page.
    const hasDetail = Boolean(detail);
    const tagName = hasDetail ? "a" : "article";
    const rootAttrs = hasDetail
      ? `href="project.html?id=${encodeURIComponent(id)}"`
      : `tabindex="0"`;

    const links = [];
    if (demoUrl) links.push(`<a href="${escapeHtml(demoUrl)}" class="btn btn-primary" target="_blank" rel="noopener">Live Demo</a>`);
    if (sourceUrl) links.push(`<a href="${escapeHtml(sourceUrl)}" class="btn btn-ghost" target="_blank" rel="noopener">Source</a>`);

    const footer = hasDetail
      ? `<span class="tile-view-link">View project &rarr;</span>`
      : (links.length ? `<div class="tile-links">${links.join("")}</div>` : "");

    return `
      <${tagName} class="project-tile" ${rootAttrs}>
        <div class="tile-media">${media}</div>
        <div class="tile-panel">
          ${tag ? `<span class="tile-tag">${escapeHtml(tag)}</span>` : ""}
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
          <div class="stack">${stackHTML}</div>
          ${footer}
        </div>
      </${tagName}>
    `;
  }

  function wireProjectImages(container) {
    const imgs = container.querySelectorAll("[data-project-media]");
    imgs.forEach((img) => {
      const base = img.getAttribute("data-image-base");
      const fallback = img.nextElementSibling;

      function tryExt(extIndex) {
        if (extIndex >= IMAGE_EXTENSIONS.length) {
          showFallback();
          return;
        }
        img.dataset.extIndex = String(extIndex);
        img.src = `${base}.${IMAGE_EXTENSIONS[extIndex]}`;
      }

      function showFallback() {
        img.style.display = "none";
        img.removeAttribute("src");
        if (!fallback) return;
        if (isLocalPreview()) {
          const filename = `${base.split("/").pop()}.jpg`;
          fallback.innerHTML = `
            <span class="dev-placeholder">
              <span class="dev-placeholder-label">No image found</span>
              <code class="dev-placeholder-filename">Drop <strong>${escapeHtml(filename)}</strong> here</code>
            </span>
          `;
        }
        fallback.hidden = false;
      }

      img.addEventListener("load", () => {
        img.style.display = "";
      });
      img.addEventListener("error", () => {
        const current = Number(img.dataset.extIndex || "0");
        tryExt(current + 1);
      });

      tryExt(0);
    });
  }

  async function renderProjects() {
    const grid = document.querySelector("[data-project-grid]");
    if (!grid) return;
    try {
      const projects = await fetchJSON("assets/data/projects.json");
      grid.innerHTML = projects.map((p) => projectTileHTML(p)).join("");
      wireProjectImages(grid);
    } catch (err) {
      console.error(err);
    }
  }

  async function renderAbout() {
    try {
      const about = await fetchJSON("assets/data/about.json");

      const photoEl = document.querySelector("[data-about-photo]");
      if (photoEl) {
        if (about.photo) {
          photoEl.src = `assets/images/about/${about.photo}`;
          photoEl.alt = about.photoAlt || "";
          photoEl.hidden = false;
        } else {
          photoEl.hidden = true;
        }
      }

      const headingEl = document.querySelector("[data-about-heading]");
      if (headingEl) headingEl.textContent = about.heading || "About Me";

      const bioEl = document.querySelector("[data-about-bio]");
      if (bioEl) {
        const paragraphs = Array.isArray(about.bio) ? about.bio : [about.bio].filter(Boolean);
        bioEl.innerHTML = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
      }

      const contactEl = document.querySelector("[data-contact-links]");
      if (contactEl) {
        const items = [];
        if (about.email) {
          items.push(`<a href="mailto:${escapeHtml(about.email)}" class="btn btn-primary">${escapeHtml(about.email)}</a>`);
        }
        (about.links || []).forEach((link) => {
          if (link && link.url) {
            items.push(`<a href="${escapeHtml(link.url)}" class="btn btn-ghost" target="_blank" rel="noopener">${escapeHtml(link.label || link.url)}</a>`);
          }
        });
        contactEl.innerHTML = items.join("") || `<p class="empty-note">Add your email and links in assets/data/about.json.</p>`;
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function renderDocs() {
    const listEl = document.querySelector("[data-docs-list]");
    if (!listEl) return;
    try {
      const docs = await fetchJSON("assets/data/docs.json");
      if (!docs.length) {
        listEl.innerHTML = `<p class="empty-note">No documents yet — drop a file in assets/docs/ and list it in assets/data/docs.json.</p>`;
        return;
      }
      listEl.innerHTML = docs.map((doc) => {
        const { label = "Document", file = "", description = "" } = doc;
        return `
          <a class="doc-item" href="assets/docs/${escapeHtml(file)}" target="_blank" rel="noopener">
            <span class="doc-label">${escapeHtml(label)}</span>
            ${description ? `<span class="doc-description">${escapeHtml(description)}</span>` : ""}
          </a>
        `;
      }).join("");
    } catch (err) {
      console.error(err);
    }
  }

  renderProjects();
  renderAbout();
  renderDocs();
})();
