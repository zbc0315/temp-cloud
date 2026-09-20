// Command syncweb seeds the web UI that ships inside the UGOS application.
//
// The upstream Node.js project keeps its frontend in public/ and serves it from
// the site root. A UGOS Pro application is served through the system gateway, so
// the mount point is not guaranteed to be the root. This tool:
//
//  1. copies the upstream frontend into src/web/,
//  2. rewrites absolute references (/app.js, /api/...) so they resolve against
//     the directory the application was mounted at,
//  3. drops any Google Fonts dependency, so the UI makes no third-party
//     request and works on a LAN with no internet access,
//  4. adds the privacy footer, the password section caption and the
//     first-launch notice, and
//  5. versions the stylesheet and script URLs by content hash.
//
// It then asserts that neither an absolute reference nor a third-party font
// request survives, failing otherwise.
//
// It uses only the Go standard library, so the build toolchain needs nothing
// beyond Go itself.
//
// Usage (from the src directory):
//
//	go run ./cmd/syncweb -src ../public -dst ./web
package main

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

//go:embed assets
var assets embed.FS

// fontStack replaces the remote Manrope webfont. It keeps the geometric-sans
// look on every platform and covers the CJK glyphs the bilingual UI needs.
const fontStack = `font-family: system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;`

const oldFontFamily = `font-family: "Manrope", sans-serif;`

var (
	// Any <link> that pulls a font from Google, spanning multiple lines.
	fontLinkRe = regexp.MustCompile(`[ \t]*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>[ \t]*\r?\n?`)

	// Absolute references that would break under a gateway sub-path.
	absoluteRe = regexp.MustCompile(`(?:href|src)="/[^"]*"|fetch\("/[^"]*"`)

	// Any remaining URL pointing at a third-party font host.
	fontHostRe = regexp.MustCompile(`https?://[^"'\s)]+`)
)

type replacement struct {
	Old string `json:"old"`
	New string `json:"new"`
}

func fatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "syncweb: "+format+"\n", args...)
	os.Exit(1)
}

func asset(name string) string {
	b, err := assets.ReadFile("assets/" + name)
	if err != nil {
		fatalf("embedded asset %s: %v", name, err)
	}
	return string(b)
}

func loadReplacements() []replacement {
	raw := asset("replacements.json")
	var pairs [][2]string
	if err := json.Unmarshal([]byte(raw), &pairs); err != nil {
		fatalf("replacements.json: %v", err)
	}
	out := make([]replacement, 0, len(pairs))
	for _, p := range pairs {
		out = append(out, replacement{Old: p[0], New: p[1]})
	}
	return out
}

// seed replaces dst with a copy of every regular file in src.
func seed(src, dst string) {
	if err := os.RemoveAll(dst); err != nil {
		fatalf("clear %s: %v", dst, err)
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		fatalf("create %s: %v", dst, err)
	}

	entries, err := os.ReadDir(src)
	if err != nil {
		fatalf("read upstream %s: %v", src, err)
	}
	copied := 0
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		data, err := os.ReadFile(filepath.Join(src, e.Name()))
		if err != nil {
			fatalf("read %s: %v", e.Name(), err)
		}
		if err := os.WriteFile(filepath.Join(dst, e.Name()), []byte(normalizeEOL(string(data))), 0o644); err != nil {
			fatalf("write %s: %v", e.Name(), err)
		}
		copied++
	}
	fmt.Printf("  seeded %s from %s (%d files)\n", dst, src, copied)
}

func patchHTML(dst string) {
	path := filepath.Join(dst, "index.html")
	html := readFile(path)
	before := len(html)

	html = strings.ReplaceAll(html, `href="/styles.css"`, `href="styles.css"`)
	html = strings.ReplaceAll(html, `src="/app.js"`, `src="app.js"`)
	html = fontLinkRe.ReplaceAllString(html, "")

	anchor := `    <script src="app.js"></script>`
	if !strings.Contains(html, anchor) {
		fatalf("index.html: script anchor not found")
	}
	html = strings.Replace(html, anchor, asset("privacy-markup.html")+anchor, 1)

	writeFile(path, html)
	fmt.Printf("  index.html: relative assets, Google Fonts removed (%d bytes), privacy footer + notice added\n",
		before-len(html))
}

func patchCSS(dst string) {
	path := filepath.Join(dst, "styles.css")
	css := readFile(path)

	// The upstream stylesheet used to pull Manrope from Google Fonts. The font
	// stack is declared locally now, so this only rewrites a sheet that still
	// asks for the remote face; both cases are valid, hence the guard.
	if strings.Contains(css, oldFontFamily) {
		css = strings.ReplaceAll(css, oldFontFamily, fontStack)
	}
	css += asset("privacy.css")

	writeFile(path, css)
	fmt.Println("  styles.css: no remote webfont, system stack in place; privacy styles appended")
}

func patchJS(dst string) {
	path := filepath.Join(dst, "app.js")
	js := readFile(path)

	const marker = "const state = {"
	if !strings.Contains(js, marker) {
		fatalf("app.js: insertion marker not found")
	}
	if strings.Contains(js, "const APP_BASE") {
		fatalf("app.js: already patched")
	}
	js = strings.Replace(js, marker, asset("helper.js")+marker, 1)

	replacements := loadReplacements()
	for _, r := range replacements {
		if !strings.Contains(js, r.Old) {
			fatalf("app.js: pattern not found: %q", r.Old)
		}
		js = strings.ReplaceAll(js, r.Old, r.New)
	}
	js += asset("privacy.js")

	writeFile(path, js)
	fmt.Printf("  app.js: %d patch sites applied, API calls resolve against APP_BASE, privacy notice appended\n",
		len(replacements))
}

// versionAssets appends a content hash to the stylesheet and script URLs.
//
// UGOS's nginx maps both text/css and application/javascript to
// "public, max-age=2592000" with no revalidation, while text/html gets
// "no-cache,no-store". Without a version in the URL, a browser that has already
// loaded the application keeps running the previous bundle for up to 30 days
// after an upgrade - the new HTML would be served alongside the old script. The
// hash changes whenever the file changes, and index.html is never cached, so
// the two can never disagree.
func versionAssets(dst string) {
	appHash := contentHash(filepath.Join(dst, "app.js"))
	cssHash := contentHash(filepath.Join(dst, "styles.css"))

	path := filepath.Join(dst, "index.html")
	html := readFile(path)

	for _, ref := range []struct{ old, new string }{
		{`src="app.js"`, `src="app.js?v=` + appHash + `"`},
		{`href="styles.css"`, `href="styles.css?v=` + cssHash + `"`},
	} {
		if !strings.Contains(html, ref.old) {
			fatalf("index.html: %s not found, so the asset URL cannot be versioned", ref.old)
		}
		html = strings.ReplaceAll(html, ref.old, ref.new)
	}

	writeFile(path, html)
	fmt.Printf("  index.html: asset URLs versioned (app.js?v=%s, styles.css?v=%s)\n", appHash, cssHash)
}

// contentHash returns the first 12 hex digits of the file's SHA-256.
func contentHash(path string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		fatalf("read %s: %v", path, err)
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])[:12]
}

// reportProblems fails the run if absolute references or third-party font
// requests are still present, which would break a gateway sub-path or leak a
// request to a remote host.
func reportProblems(dst string) {
	var problems []string

	entries, err := os.ReadDir(dst)
	if err != nil {
		fatalf("read %s: %v", dst, err)
	}
	for _, e := range entries {
		switch filepath.Ext(e.Name()) {
		case ".js", ".html", ".css":
		default:
			continue
		}
		text := readFile(filepath.Join(dst, e.Name()))

		for _, m := range absoluteRe.FindAllString(text, -1) {
			problems = append(problems, fmt.Sprintf("%s: absolute reference %s", e.Name(), m))
		}
		for _, m := range fontHostRe.FindAllString(text, -1) {
			if strings.Contains(m, "fonts.googleapis.com") || strings.Contains(m, "fonts.gstatic.com") {
				problems = append(problems, fmt.Sprintf("%s: remote font %s", e.Name(), m))
			}
		}
	}

	if len(problems) > 0 {
		fatalf("the UI still has absolute references or third-party font requests:\n  %s",
			strings.Join(problems, "\n  "))
	}
	fmt.Println("  problems found: none")
}

// normalizeEOL collapses CRLF and lone CR to LF.
//
// The project's .gitattributes declares eol=lf, while the upstream checkout's
// line endings depend on the machine's git autocrlf setting. Without this the
// generated src/web would differ between machines and end up with mixed line
// endings (CRLF from the copied upstream files, LF from the injected blocks).
func normalizeEOL(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	return strings.ReplaceAll(s, "\r", "\n")
}

func readFile(path string) string {
	b, err := os.ReadFile(path)
	if err != nil {
		fatalf("read %s: %v", path, err)
	}
	return normalizeEOL(string(b))
}

func writeFile(path, content string) {
	if err := os.WriteFile(path, []byte(normalizeEOL(content)), 0o644); err != nil {
		fatalf("write %s: %v", path, err)
	}
}

func main() {
	src := flag.String("src", filepath.Join("..", "..", "public"), "upstream public/ directory to copy from")
	dst := flag.String("dst", "web", "destination web directory (src/web)")
	flag.Parse()

	if st, err := os.Stat(filepath.Join(*src, "app.js")); err != nil || st.IsDir() {
		fatalf("upstream frontend not found: %s (expected index.html, app.js and styles.css there)", *src)
	}

	seed(*src, *dst)
	patchCSS(*dst)
	patchJS(*dst)
	patchHTML(*dst)
	versionAssets(*dst)
	reportProblems(*dst)
}
