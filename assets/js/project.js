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

  async function fetchText(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.text();
  }

  function isLocalPreview() {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  }

  function renderInline(text) {
    return text
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // Small hand-rolled markdown subset: paragraphs, ##/### headings, **bold**,
  // *italic*, [text](url) links, and "- " unordered lists. Input is escaped
  // first so authored content can't inject markup.
  function renderMarkdown(md) {
    const lines = escapeHtml(md).split(/\r?\n/);
    const html = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() === "") {
        i++;
        continue;
      }
      if (/^###\s+/.test(line)) {
        html.push(`<h5>${renderInline(line.replace(/^###\s+/, ""))}</h5>`);
        i++;
        continue;
      }
      if (/^##\s+/.test(line)) {
        html.push(`<h4>${renderInline(line.replace(/^##\s+/, ""))}</h4>`);
        i++;
        continue;
      }
      if (/^-\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^-\s+/.test(lines[i])) {
          items.push(`<li>${renderInline(lines[i].replace(/^-\s+/, ""))}</li>`);
          i++;
        }
        html.push(`<ul>${items.join("")}</ul>`);
        continue;
      }
      const paragraph = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        !/^##\s+/.test(lines[i]) &&
        !/^###\s+/.test(lines[i]) &&
        !/^-\s+/.test(lines[i])
      ) {
        paragraph.push(lines[i]);
        i++;
      }
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    }
    return html.join("");
  }

  function getProjectId() {
    return new URLSearchParams(location.search).get("id") || "";
  }

  function renderNotFound(message) {
    const headerEl = document.querySelector("[data-project-header]");
    if (headerEl) headerEl.innerHTML = `<p class="empty-note">${escapeHtml(message)}</p>`;
  }

  function setActiveTile(tilesEl, key) {
    tilesEl.querySelectorAll("[data-section-key]").forEach((el) => {
      el.classList.toggle("active", el.dataset.sectionKey === key);
    });
  }

  async function init() {
    const id = getProjectId();
    if (!id) {
      renderNotFound("No project specified.");
      return;
    }

    let projects;
    try {
      projects = await fetchJSON("assets/data/projects.json");
    } catch (err) {
      console.error(err);
      renderNotFound("Couldn't load project data.");
      return;
    }

    const project = projects.find((p) => p.id === id);
    if (!project || !project.detail) {
      renderNotFound("Project not found.");
      return;
    }

    document.title = `${project.title || "Project"} · Portfolio`;

    const headerEl = document.querySelector("[data-project-header]");
    if (headerEl) {
      headerEl.innerHTML = `
        ${project.tag ? `<span class="tile-tag">${escapeHtml(project.tag)}</span>` : ""}
        <h1>${escapeHtml(project.title || "")}</h1>
        <p class="project-summary">${escapeHtml(project.detail.summary || project.description || "")}</p>
      `;
    }

    const sections = project.detail.sections || [];

    const sectionContent = {};
    await Promise.all(sections.map(async (s) => {
      const path = `assets/data/projects/${encodeURIComponent(id)}/${encodeURIComponent(s.key)}.md`;
      try {
        sectionContent[s.key] = { html: renderMarkdown(await fetchText(path)) };
      } catch (err) {
        sectionContent[s.key] = { missing: true, path };
      }
    }));

    // Local preview keeps every declared tab visible (with a dev-placeholder
    // prompt) so authors know what's still missing; the live site only shows
    // tabs for sections that actually have content.
    const visibleSections = isLocalPreview()
      ? sections
      : sections.filter((s) => sectionContent[s.key] && sectionContent[s.key].html !== undefined);

    const tilesEl = document.querySelector("[data-section-tiles]");
    if (tilesEl) {
      tilesEl.innerHTML = visibleSections.map((s) => `
        <a class="section-tile" data-section-key="${escapeHtml(s.key)}" href="#${escapeHtml(s.key)}">
          ${s.glyph ? `<span class="glyph">${escapeHtml(s.glyph)}</span>` : ""}
          <span class="section-tile-label">${escapeHtml(s.label || s.key)}</span>
        </a>
      `).join("");
    }

    function wireContentImages(container) {
      container.querySelectorAll("img").forEach((img) => {
        img.addEventListener("error", () => {
          const src = img.getAttribute("src") || "";
          if (isLocalPreview()) {
            const placeholder = document.createElement("span");
            placeholder.className = "dev-placeholder";
            placeholder.innerHTML = `
              <span class="dev-placeholder-label">No image found</span>
              <code class="dev-placeholder-filename">Drop <strong>${escapeHtml(src)}</strong> here</code>
            `;
            img.replaceWith(placeholder);
          } else {
            img.remove();
          }
        }, { once: true });
      });
    }

    function renderSectionContentFor(section) {
      const contentEl = document.querySelector("[data-section-content]");
      if (!contentEl || !section) return;
      const data = sectionContent[section.key];
      if (data && data.html !== undefined) {
        contentEl.innerHTML = data.html;
        wireContentImages(contentEl);
        return;
      }
      if (isLocalPreview()) {
        contentEl.innerHTML = `
          <span class="dev-placeholder">
            <span class="dev-placeholder-label">No content found</span>
            <code class="dev-placeholder-filename">Drop <strong>${escapeHtml(data.path)}</strong> here</code>
          </span>
        `;
      } else {
        contentEl.innerHTML = "";
      }
    }

    function activateFromHash() {
      const hashKey = location.hash.replace("#", "");
      const match = visibleSections.find((s) => s.key === hashKey) || visibleSections[0];
      if (!match) return;
      if (tilesEl) setActiveTile(tilesEl, match.key);
      renderSectionContentFor(match);
    }

    window.addEventListener("hashchange", activateFromHash);
    activateFromHash();
  }

  init();
})();
