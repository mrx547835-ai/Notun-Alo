
# Notun Alo — Serverless News Portal

A lightweight, fast, serverless news portal built with plain HTML, Tailwind CSS, IndexedDB, and GitHub as a backend CMS. It supports both **English** and **বাংলা (Bengali)** articles with zero server or database hosting costs.

---

## Features

- **Zero Backend / Free Hosting:** Runs completely on GitHub Pages (or any static host).
- **Sequential Numeric Slugs:** Published articles are automatically saved as `posts/1.md`, `posts/2.md`, `posts/3.md`, etc. (prevents filename issues with Bengali headlines).
- **Minimal Data Usage (Reader IndexedDB Cache):**
  - Returning readers load cached articles instantly from their browser's IndexedDB (`NotunAloCache_*`).
  - Only checks `posts/index.json` and downloads **brand-new** or **edited** posts.
- **6-Month Auto-Cleanup & On-Demand Archive:**
  - Articles older than 6 months are automatically removed from the reader's IndexedDB.
  - Older articles are never auto-downloaded—readers can load them in batches of 6 via the **Load Older Posts** button.
- **Full Article Pages & Related Content:** Clicking any headline opens a dedicated article page (`#post=<number>`) with up to 3 related stories underneath.
- **Pagination, Search & Categories:** Paginated home feed (7 posts on page 1, 6 per page after), live headline search, and category filtering (`National`, `Politics`, `Sports`, `Tech`, `Entertainment`).
- **Built-in Info Pages:** Includes working pages for **About**, **Terms**, **Privacy**, **Disclaimer**, **FAQ**, and **Contact** in the footer (`#page=...`).
- **Full Admin Desk (`admin.html`):** Draft management in IndexedDB, plus publish, edit, and delete support for live GitHub posts.

---

## Project Structure

```text
Notun-Alo/
├── index.html          # Public newspaper front page & reader cache
├── admin.html          # Editorial admin panel (drafts + GitHub publisher)
├── README.md           # Documentation
└── posts/              # Auto-created when you publish your first article
    ├── index.json      # Compact manifest: [{"n":2,"d":"...","v":1}, {"n":1,"d":"..."}]
    ├── 1.md
    └── 2.md
```

---

## Setup Tutorial

### Step 1: Create a Public GitHub Repository
1. Create a **Public** repository on GitHub (for example: `Notun-Alo`).
   > **Important:** The repository **must be Public** so visitors can read `posts/index.json` and `posts/*.md` without needing authentication.
2. Upload `index.html` and `admin.html` to the root of your repository.

### Step 2: Update Default Repo Settings in Code (If Using Your Own Repo)
By default, `index.html` and `admin.html` point to:
- **Owner:** `mrx547835-ai`
- **Repo:** `Notun-Alo`
- **Branch:** `main`

If you deploy under a different GitHub username, repository name, or branch:
1. Open **`index.html`** and update `GH_CONFIG`:
   ```js
   const GH_CONFIG = {
     owner: localStorage.getItem('ds_gh_owner') || 'YOUR_GITHUB_USERNAME',
     repo: localStorage.getItem('ds_gh_repo') || 'YOUR_REPO_NAME',
     branch: localStorage.getItem('ds_gh_branch') || 'main'
   };
   ```
   *(Updating this directly in `index.html` is required so all public visitors read from your repository.)*
2. Open **`admin.html`** and update `DEFAULT_OWNER`, `DEFAULT_REPO`, and `DEFAULT_BRANCH` (and the default `<input value="...">` values if desired).

### Step 3: Customize Branding, Contact Info & Admin Login (Recommended)
1. **Change Admin Login (`admin.html`):**
   Find the login check in `admin.html` and change `admin` / `1234` to your preferred username and password:
   ```js
   if (loginUser.value.trim() === 'admin' && loginPass.value === '1234')
   ```
   > **Note:** Client-side login is only a basic UI lock. Real security comes from keeping your GitHub Personal Access Token private.
2. **Update Contact & Static Pages (`index.html`):**
   Edit the `STATIC_PAGES` object in `index.html` to set your real email address (default placeholder: `editorial@notunalo.com`) and customize your About, Terms, Privacy, Disclaimer, and FAQ text.

### Step 4: Enable GitHub Pages
1. Go to your repository on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Select branch **`main`** and folder **`/ (root)`**, then click **Save**.
4. Wait 1–2 minutes. Your live site will be available at:
   - **Front Page:** `https://<username>.github.io/<repo>/`
   - **Admin Panel:** `https://<username>.github.io/<repo>/admin.html` (also linked as **Admin Panel** in the footer)

### Step 5: Generate a GitHub Personal Access Token (PAT)
To allow `admin.html` to create, edit, and delete files in your repository:
1. Go to GitHub **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Give it a name (e.g., `Notun Alo Admin`) and set an expiration.
3. Under **Repository access**, select **Only select repositories** and choose your news repository.
4. Under **Repository permissions**, set **Contents** to **Read and write**.
5. Click **Generate token** and copy the token immediately.
   > **Never paste or commit your token into `admin.html` or any repository file.**

### Step 6: Connect the Admin Panel
1. Open `admin.html` (via your live URL or the **Admin Panel** link in the footer).
2. Sign in with your admin username and password (`admin` / `1234` by default).
3. In **GitHub Publish Settings**:
   - Paste your **Personal Access Token**.
   - Verify **Owner**, **Repository**, and **Branch**.
   - Click **Save Settings**.
   *(Settings are saved locally in your browser's `localStorage`.)*

---

## Operation Tutorial

### 1. Writing & Saving a Draft
1. Log in to `admin.html`.
2. Fill in the **Write New Draft** form:
   - **Headline** *(required)*
   - **Category** *(National, Politics, Sports, Tech, Entertainment)*
   - **Author** *(defaults to `Staff Correspondent` if left blank)*
   - **Image URL** *(optional `https://...` image link)*
   - **Excerpt** *(required one-line summary)*
   - **Article Content** *(required; separate paragraphs with blank lines)*
3. Click **Save Draft**.
   - Drafts are saved locally in your browser (`NewspaperDB` IndexedDB) and are **not** visible to readers until published.

### 2. Publishing an Article
1. In the **Saved Drafts** table, click **Publish** next to a draft.
2. The admin panel automatically:
   - Scans `posts/` and `posts/index.json` to pick the next sequential number (`1.md`, `2.md`, …).
   - Uploads `posts/<n>.md` to GitHub.
   - Updates `posts/index.json` with `{ "n": <number>, "d": "<ISO date>" }`.
3. Once published, you will be asked whether to delete the local draft:
   - Click **OK** to clear the draft from your local list.
   - Click **Cancel** if you want to keep it locally for quick updates (it will show a `#<n>.md` badge and an **Update** button).

### 3. Editing a Published Article
1. Scroll down to **Published Posts (GitHub)** in `admin.html` (loads 10 posts at a time; click **Load More** or **Refresh** as needed).
2. Click **Edit** on the article you want to modify.
3. The live article loads into the top form, and the submit button changes to **Update Published Post**.
4. Make your changes and click **Update Published Post**.
   - Original publish date is preserved.
   - The post's version (`v`) in `posts/index.json` is incremented so returning readers automatically fetch the updated version.

### 4. Deleting a Published Article
1. In **Published Posts (GitHub)**, click **Delete** on the article.
2. Confirm the prompt.
3. The `.md` file is deleted from `posts/` on GitHub and removed from `posts/index.json`. Returning readers' caches will automatically drop the deleted article on their next visit.

---

## How Reader Caching Works (`index.html`)

1. **First Visit:** Fetches `posts/index.json`, downloads only articles from the **last 6 months**, and stores them in the reader's browser (`NotunAloCache_*` IndexedDB).
2. **Repeat Visits:** Displays cached articles immediately, deletes any cached articles older than 6 months, and checks `posts/index.json`—downloading **0 files** if nothing changed, or only newly published / edited articles.
3. **Archive (> 6 Months Old):** Older articles are queued and only fetched (6 at a time) when the reader clicks **Load Older Posts**, or when someone opens a direct `#post=<number>` link.

---

## Troubleshooting

- **Published post doesn't appear immediately on the front page:**
  GitHub's `raw.githubusercontent.com` edge cache can occasionally take 1–5 minutes to reflect a brand-new commit. Hard-refresh (`Ctrl + Shift + R`) after a minute.
- **`GitHub Publish Error` / `401` / `403` / `404` in Admin:**
  - Verify your **Personal Access Token** hasn't expired and has **Contents: Read and write** permission on the target repository.
  - Check that **Owner**, **Repository**, and **Branch** match GitHub exactly (case-sensitive).
- **Front page shows "Could not load posts from GitHub":**
  - Ensure the repository is **Public**.
  - Check that `GH_CONFIG` in `index.html` matches your actual GitHub owner/repo/branch.
- **Images not showing:**
  Only `https://`, `http://`, and `data:image/` URLs are accepted in the **Image URL** field. Make sure the image link is publicly accessible (hotlink-allowed).
