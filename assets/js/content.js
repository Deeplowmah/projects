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

  function projectCardHTML(project, i, total) {
    const {
      title = "",
      description = "",
      tag = "",
      glyph = "",
      image = "",
      imageAlt = "",
      stack = [],
      demoUrl = "",
      sourceUrl = "",
    } = project;

    const media = image
      ? `<img src="assets/images/projects/${escapeHtml(image)}" alt="${escapeHtml(imageAlt || title)}" loading="lazy" />`
      : glyph
        ? `<span class="glyph">${escapeHtml(glyph)}</span>`
        : "";

    const stackHTML = (stack || []).map((s) => `<span>${escapeHtml(s)}</span>`).join("");

    const links = [];
    if (demoUrl) links.push(`<a href="${escapeHtml(demoUrl)}" class="btn btn-primary" target="_blank" rel="noopener">Live Demo</a>`);
    if (sourceUrl) links.push(`<a href="${escapeHtml(sourceUrl)}" class="btn btn-ghost" target="_blank" rel="noopener">Source</a>`);

    const indexLabel = `${String(i + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

    return `
      <article class="project-card">
        <div class="card-inner">
          <div class="card-media">
            <span class="tag">${escapeHtml(tag)}</span>
            ${media}
          </div>
          <div class="card-body">
            <span class="index">${indexLabel}</span>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(description)}</p>
            <div class="stack">${stackHTML}</div>
            ${links.length ? `<div class="card-links">${links.join("")}</div>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  async function renderProjects() {
    const track = document.querySelector("[data-carousel-track]");
    if (!track) return;
    try {
      const projects = await fetchJSON("assets/data/projects.json");
      track.innerHTML = projects.map((p, i) => projectCardHTML(p, i, projects.length)).join("");
    } catch (err) {
      console.error(err);
    } finally {
      window.PortfolioCarousel && window.PortfolioCarousel.init();
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
