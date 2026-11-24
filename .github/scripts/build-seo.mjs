import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT_POST_DIR = path.join(ROOT, 'post');

function getSiteUrl() {
  const cnamePath = path.join(ROOT, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    const cname = fs.readFileSync(cnamePath, 'utf8').trim();
    if (cname) return `https://${cname.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`;
  }
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, '');
  }
  const ghRepo = process.env.GITHUB_REPOSITORY || 'mrx547835-ai/Notun-Alo';
  const [owner, repo] = ghRepo.split('/');
  if (repo && repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
    return `https://${owner}.github.io`;
  }
  return `https://${owner}.github.io/${repo}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeImageUrl(url) {
  const trimmed = String(url || '').trim();
  return /^(https?:\/\/)/i.test(trimmed) ? trimmed : '';
}

function parseMarkdownPost(raw, filename) {
  const normalized = String(raw || '').replace(/\r\n/g, '\n');
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const slug = filename.replace(/\.md$/i, '');

  const meta = {
    title: slug,
    date: '',
    category: 'National',
    author: 'Staff Correspondent',
    image: '',
    breaking: 'false',
    featured: 'false'
  };

  let bodyRaw = normalized;
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      }
      if (key in meta) meta[key] = val;
    }
    bodyRaw = fmMatch[2] || '';
  }

  const lines = bodyRaw.split('\n');
  let firstIdx = 0;
  while (firstIdx < lines.length && lines[firstIdx].trim() === '') firstIdx++;

  const excerpt = firstIdx < lines.length ? lines[firstIdx].trim() : '';
  const content = lines.slice(firstIdx + 1).join('\n').trim();
  const words = `${excerpt} ${content}`.trim().split(/\s+/).filter(Boolean).length;

  return {
    slug,
    filename,
    num: /^\d+$/.test(slug) ? parseInt(slug, 10) : 0,
    title: meta.title || 'Untitled',
    date: meta.date || new Date().toISOString(),
    category: meta.category || 'National',
    author: meta.author || 'Staff Correspondent',
    image: sanitizeImageUrl(meta.image),
    readMins: Math.max(1, Math.ceil(words / 200)),
    excerpt,
    content
  };
}

function formatDateDisplay(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildStaticPostHtml(post, relatedPosts, siteUrl) {
  const canonical = `${siteUrl}/post/${encodeURIComponent(post.slug)}.html`;
  const desc = (post.excerpt || post.content || post.title).slice(0, 160);
  const paragraphs = (post.content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="whitespace-pre-line">${escapeHtml(p)}</p>`)
    .join('\n          ');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: desc,
    datePublished: post.date,
    articleSection: post.category,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'Notun Alo' },
    mainEntityOfPage: canonical
  };
  if (post.image) schema.image = [post.image];

  const relatedHtml = relatedPosts.length
    ? `
      <section class="mt-12 pt-6 border-t-2 border-black">
        <div class="flex items-center justify-between mb-5 border-b border-neutral-200 pb-2">
          <h2 class="font-editorial text-xl font-bold uppercase tracking-wide text-black">Related Content</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          ${relatedPosts
            .map(
              (r) => `
            <a href="./${encodeURIComponent(r.slug)}.html" class="group border-b border-neutral-200 pb-4 flex flex-col">
              ${r.image ? `<img src="${escapeHtml(r.image)}" alt="${escapeHtml(r.title)}" loading="lazy" class="w-full h-40 object-cover rounded-sm border border-neutral-200 mb-3" />` : ''}
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[11px] font-bold uppercase tracking-wider text-red-600">${escapeHtml(r.category)}</span>
                <span class="text-xs text-neutral-500">${escapeHtml(formatDateDisplay(r.date))}</span>
              </div>
              <h3 class="font-editorial text-lg font-bold text-black group-hover:text-red-600 leading-snug mb-1.5">${escapeHtml(r.title)}</h3>
              <p class="text-xs text-neutral-600">${escapeHtml((r.excerpt || '').slice(0, 110))}</p>
            </a>`
            )
            .join('')}
        </div>
      </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)} — Notun Alo</title>
  <meta name="description" content="${escapeHtml(desc)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="icon" type="image/svg+xml" href="../icon.svg" />
  <meta property="og:site_name" content="Notun Alo" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(post.title)}" />
  <meta property="og:description" content="${escapeHtml(desc)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  ${post.image ? `<meta property="og:image" content="${escapeHtml(post.image)}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(post.title)}" />
  <meta name="twitter:description" content="${escapeHtml(desc)}" />
  ${post.image ? `<meta name="twitter:image" content="${escapeHtml(post.image)}" />` : ''}
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Serif+Bengali:wght@600;700&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; }
    .font-editorial { font-family: 'Playfair Display', 'Noto Serif Bengali', Georgia, serif; }
  </style>
</head>
<body class="bg-white text-neutral-900 min-h-screen flex flex-col">
  <header class="border-b-2 border-black bg-white">
    <div class="max-w-6xl mx-auto px-4 py-4 text-center">
      <a href="../index.html" class="inline-block">
        <span class="font-editorial text-4xl font-extrabold tracking-tight text-black">Notun <span class="text-red-600">Alo</span></span>
        <div class="h-1 w-20 bg-red-600 mx-auto mt-1"></div>
      </a>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between border-b border-neutral-200 pb-3 mb-5">
        <a href="../index.html" class="text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:text-red-600">&larr; Back to News</a>
        <span class="bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm">${escapeHtml(post.category)}</span>
      </div>

      <article>
        <h1 class="font-editorial text-3xl sm:text-4xl font-bold text-black leading-tight mb-3">${escapeHtml(post.title)}</h1>
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-neutral-600 border-b border-neutral-200 pb-4 mb-6">
          <div class="flex flex-wrap items-center gap-2.5">
            <span>By <strong class="text-neutral-900">${escapeHtml(post.author)}</strong></span>
            <span>•</span>
            <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDateDisplay(post.date))}</time>
            <span>•</span>
            <span>${post.readMins} min read</span>
          </div>
          <div class="flex items-center gap-1.5 text-[11px] font-semibold">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer" class="bg-[#1877F2] text-white px-2 py-1 rounded-sm">Facebook</a>
            <a href="https://wa.me/?text=${encodeURIComponent(post.title + ' — ' + canonical)}" target="_blank" rel="noopener noreferrer" class="bg-[#25D366] text-white px-2 py-1 rounded-sm">WhatsApp</a>
            <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer" class="bg-black text-white px-2 py-1 rounded-sm">X</a>
          </div>
        </div>

        ${post.image ? `<div class="mb-6"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}" class="w-full max-h-[460px] object-cover rounded-sm border border-neutral-200" /></div>` : ''}
        ${post.excerpt ? `<p class="text-base sm:text-lg font-semibold text-neutral-800 leading-relaxed mb-6 border-l-4 border-red-600 pl-4">${escapeHtml(post.excerpt)}</p>` : ''}
        <div class="space-y-4 text-neutral-800 leading-relaxed text-base sm:text-[17px]">
          ${paragraphs}
        </div>
      </article>
    </div>

    ${relatedHtml}
  </main>

  <footer class="border-t-2 border-black bg-neutral-50 text-neutral-600 text-xs mt-auto">
    <div class="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p class="font-semibold text-neutral-900">&copy; ${new Date().getFullYear()} Notun Alo. All rights reserved.</p>
      <nav class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a href="../index.html#page=about" class="hover:text-red-600">About</a>
        <a href="../index.html#page=terms" class="hover:text-red-600">Terms</a>
        <a href="../index.html#page=privacy" class="hover:text-red-600">Privacy</a>
        <a href="../index.html#page=disclaimer" class="hover:text-red-600">Disclaimer</a>
        <a href="../index.html#page=faq" class="hover:text-red-600">FAQ</a>
        <a href="../index.html#page=contact" class="hover:text-red-600">Contact</a>
        <a href="../admin.html" class="text-neutral-900 font-semibold hover:text-red-600 underline">Admin Panel</a>
      </nav>
    </div>
  </footer>
</body>
</html>
`;
}

async function notifyTelegram(posts, siteUrl) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const addedRaw = process.env.NEW_POST_FILES || '';
  if (!botToken || !chatId || !addedRaw) return;

  const addedSet = new Set(
    addedRaw
      .split(',')
      .map((s) => path.basename(s.trim()))
      .filter(Boolean)
  );

  for (const post of posts) {
    if (!addedSet.has(post.filename)) continue;
    const url = `${siteUrl}/post/${encodeURIComponent(post.slug)}.html`;
    const text = `📰 *${post.category}*\n\n*${post.title}*\n\n${post.excerpt ? post.excerpt + '\n\n' : ''}🔗 ${url}`;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.error('Telegram notify failed:', err.message);
    }
  }
}

async function main() {
  const siteUrl = getSiteUrl();
  let posts = [];

  if (fs.existsSync(POSTS_DIR)) {
    const files = fs.readdirSync(POSTS_DIR).filter((f) => f.toLowerCase().endsWith('.md'));
    posts = files.map((file) => parseMarkdownPost(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'), file));
    posts.sort((a, b) => {
      const ta = Date.parse(a.date) || 0;
      const tb = Date.parse(b.date) || 0;
      if (tb !== ta) return tb - ta;
      return b.num - a.num;
    });
  }

  fs.mkdirSync(OUT_POST_DIR, { recursive: true });
  const validHtmlFiles = new Set();

  for (const post of posts) {
    const others = posts.filter((p) => p.slug !== post.slug);
    const sameCat = others.filter((p) => p.category.toLowerCase() === post.category.toLowerCase());
    const otherCat = others.filter((p) => p.category.toLowerCase() !== post.category.toLowerCase());
    const related = sameCat.concat(otherCat).slice(0, 3);

    const outName = `${post.slug}.html`;
    validHtmlFiles.add(outName);
    fs.writeFileSync(path.join(OUT_POST_DIR, outName), buildStaticPostHtml(post, related, siteUrl), 'utf8');
  }

  for (const existing of fs.readdirSync(OUT_POST_DIR)) {
    if (existing.endsWith('.html') && !validHtmlFiles.has(existing)) {
      fs.unlinkSync(path.join(OUT_POST_DIR, existing));
    }
  }

  const robots = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin.html',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');

  const urlEntries = [
    `  <url>\n    <loc>${escapeXml(siteUrl)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
  ];
  for (const post of posts) {
    const d = new Date(post.date);
    const lastmod = !isNaN(d.getTime()) ? `\n    <lastmod>${d.toISOString()}</lastmod>` : '';
    urlEntries.push(
      `  <url>\n    <loc>${escapeXml(`${siteUrl}/post/${encodeURIComponent(post.slug)}.html`)}</loc>${lastmod}\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

  const rssItems = posts.slice(0, 20).map((post) => {
    const link = `${siteUrl}/post/${encodeURIComponent(post.slug)}.html`;
    const pubDate = !isNaN(Date.parse(post.date)) ? new Date(post.date).toUTCString() : new Date().toUTCString();
    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
      `      <category>${escapeXml(post.category)}</category>`,
      `      <description>${escapeXml(post.excerpt || post.content.slice(0, 200))}</description>`,
      '    </item>'
    ].join('\n');
  });

  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>Notun Alo</title>',
    `    <link>${escapeXml(siteUrl)}/</link>`,
    '    <description>Latest stories from Notun Alo — Sylhet, Bangladesh</description>',
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    rssItems.join('\n'),
    '  </channel>',
    '</rss>',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'rss.xml'), rss, 'utf8');

  await notifyTelegram(posts, siteUrl);
  console.log(`Generated SEO assets for ${posts.length} posts at ${siteUrl}`);
}

main();
