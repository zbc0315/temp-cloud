// Command tempcloud is the backend service for the "Temp Cloud" UGOS Pro application.
//
// It is a dependency-free Go rewrite of the original Node.js (Express + multer)
// service. The web UI is embedded into the binary, so a single static executable
// serves both the frontend and the HTTP API. No runtime, no interpreter, no
// container is required on the device.
//
// Layout at runtime (UGOS Pro native application):
//
//	$UGAPP_INSTALL_DIR/bin/tempcloud   read-only executable
//	$UGAPP_DATA_DIR/                   writable state (items.json + uploads/)
//	$UGAPP_LOG_DIR/                    stdout/stderr captured by the system
//
// The process is started by the system with the configured port and is expected
// to stay in the foreground. It exits gracefully on SIGTERM within 10 seconds.
package main

import (
	"crypto/rand"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	defaultExpireHours = 1
	maxExpireHours     = 24
	maxUploadBytes     = 100 << 20 // 100 MiB, matches the original multer limit
	maxMultipartMemory = 16 << 20
	accessTokenTTL     = 24 * time.Hour
	cleanupInterval    = time.Minute
	shutdownGrace      = 10 * time.Second
	jsTimeLayout       = "2006-01-02T15:04:05.000Z"
)

//go:embed web
var embeddedWeb embed.FS

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

type item struct {
	ID           string `json:"id"`
	Kind         string `json:"kind"`
	Title        string `json:"title"`
	PasswordHash string `json:"passwordHash,omitempty"`
	CreatedAt    string `json:"createdAt"`
	ExpiresAt    string `json:"expiresAt"`
	Text         string `json:"text,omitempty"`
	MimeType     string `json:"mimeType,omitempty"`
	OriginalName string `json:"originalName,omitempty"`
	Size         int64  `json:"size,omitempty"`
	StoredName   string `json:"storedName,omitempty"`
}

type database struct {
	Items []item `json:"items"`
}

// publicItem is the wire representation sent to the browser. It intentionally
// hides PasswordHash and StoredName.
type publicItem struct {
	ID           string `json:"id"`
	Kind         string `json:"kind"`
	Title        string `json:"title"`
	IsProtected  bool   `json:"isProtected"`
	CreatedAt    string `json:"createdAt"`
	ExpiresAt    string `json:"expiresAt"`
	Text         string `json:"text,omitempty"`
	MimeType     string `json:"mimeType,omitempty"`
	OriginalName string `json:"originalName,omitempty"`
	Size         int64  `json:"size,omitempty"`
}

func (i item) public() publicItem {
	out := publicItem{
		ID:           i.ID,
		Kind:         i.Kind,
		Title:        i.Title,
		IsProtected:  i.PasswordHash != "",
		CreatedAt:    i.CreatedAt,
		ExpiresAt:    i.ExpiresAt,
		MimeType:     i.MimeType,
		OriginalName: i.OriginalName,
		Size:         i.Size,
	}
	if i.Kind == "text" {
		out.Text = i.Text
	}
	return out
}

type tokenMeta struct {
	passwordHash string
	expiresAt    time.Time
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

type store struct {
	mu     sync.Mutex
	dir    string
	dbPath string
	items  []item
	tokens map[string]tokenMeta
}

func newStore(dir string) (*store, error) {
	if err := os.MkdirAll(filepath.Join(dir, "uploads"), 0o755); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}
	s := &store{
		dir:    dir,
		dbPath: filepath.Join(dir, "items.json"),
		tokens: make(map[string]tokenMeta),
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

// load reads items.json. A corrupt file is preserved as a .broken-<ts> backup and
// replaced with an empty database, mirroring the original service's behaviour.
func (s *store) load() error {
	raw, err := os.ReadFile(s.dbPath)
	if errors.Is(err, fs.ErrNotExist) {
		s.items = []item{}
		return s.persist()
	}
	if err != nil {
		return fmt.Errorf("read database: %w", err)
	}

	var db database
	if err := json.Unmarshal(raw, &db); err == nil && db.Items != nil {
		s.items = db.Items
		return nil
	}

	backup := fmt.Sprintf("%s.broken-%d", s.dbPath, time.Now().UnixMilli())
	if werr := os.WriteFile(backup, raw, 0o644); werr != nil {
		log.Printf("warning: could not back up corrupt database: %v", werr)
	}
	log.Printf("warning: database was corrupt, backed up to %s and reset", backup)
	s.items = []item{}
	return s.persist()
}

// persist writes the database. Callers must hold s.mu.
func (s *store) persist() error {
	payload, err := json.MarshalIndent(database{Items: s.items}, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.dbPath + ".tmp"
	if err := os.WriteFile(tmp, payload, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.dbPath)
}

// cleanupExpired drops expired items and their uploads, then purges stale tokens.
func (s *store) cleanupExpired() {
	now := time.Now()

	s.mu.Lock()
	defer s.mu.Unlock()

	kept := make([]item, 0, len(s.items))
	for _, it := range s.items {
		if expiresAt, err := time.Parse(time.RFC3339, it.ExpiresAt); err == nil && expiresAt.After(now) {
			kept = append(kept, it)
			continue
		}
		if it.StoredName != "" {
			if err := os.Remove(filepath.Join(s.dir, "uploads", it.StoredName)); err != nil && !errors.Is(err, fs.ErrNotExist) {
				log.Printf("warning: could not remove upload %s: %v", it.StoredName, err)
			}
		}
	}

	if len(kept) != len(s.items) {
		s.items = kept
		if err := s.persist(); err != nil {
			log.Printf("warning: could not persist after cleanup: %v", err)
		}
	}

	for token, meta := range s.tokens {
		if !meta.expiresAt.After(now) {
			delete(s.tokens, token)
		}
	}
}

func (s *store) add(it item) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items = append(s.items, it)
	return s.persist()
}

func (s *store) findByID(id string) (item, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, it := range s.items {
		if it.ID == id {
			return it, true
		}
	}
	return item{}, false
}

func (s *store) listPublic() []publicItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]publicItem, 0, len(s.items))
	for _, it := range s.items {
		if it.PasswordHash == "" {
			out = append(out, it.public())
		}
	}
	sort.SliceStable(out, func(a, b int) bool { return out[a].CreatedAt > out[b].CreatedAt })
	return out
}

func (s *store) listByPasswordHash(hash string) []publicItem {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]publicItem, 0)
	for _, it := range s.items {
		if it.PasswordHash == hash {
			out = append(out, it.public())
		}
	}
	sort.SliceStable(out, func(a, b int) bool { return out[a].CreatedAt > out[b].CreatedAt })
	return out
}

func (s *store) issueToken(passwordHash string) string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand failing is unrecoverable for token issuance.
		panic(fmt.Sprintf("rand: %v", err))
	}
	token := hex.EncodeToString(buf)
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[token] = tokenMeta{passwordHash: passwordHash, expiresAt: time.Now().Add(accessTokenTTL)}
	return token
}

func (s *store) tokenMatchesPassword(token, passwordHash string) bool {
	if token == "" {
		return false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	meta, ok := s.tokens[token]
	if !ok || !meta.expiresAt.After(time.Now()) {
		return false
	}
	return meta.passwordHash == passwordHash
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

type server struct {
	store *store
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("warning: could not write response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func sanitizeHours(raw string) int {
	hours, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil || hours <= 0 {
		return defaultExpireHours
	}
	if hours > maxExpireHours {
		return maxExpireHours
	}
	return int(hours)
}

func hashPassword(password string) string {
	sum := sha256.Sum256([]byte(password))
	return hex.EncodeToString(sum[:])
}

// bearerToken extracts a token from the Authorization header or the query string.
func bearerToken(r *http.Request) string {
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return r.URL.Query().Get("token")
}

// ensureAccess reports whether the request may read the given item.
func (s *server) ensureAccess(r *http.Request, it item) bool {
	if it.PasswordHash == "" {
		return true
	}
	return s.store.tokenMatchesPassword(bearerToken(r), it.PasswordHash)
}

func (s *server) handleConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]int{
		"defaultExpireHours": defaultExpireHours,
		"maxExpireHours":     maxExpireHours,
	})
}

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "service": "temp-cloud"})
}

func (s *server) handlePublicItems(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"items": s.store.listPublic()})
}

func (s *server) handleAccess(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式不正确")
		return
	}
	if body.Password == "" {
		writeError(w, http.StatusBadRequest, "请输入密码")
		return
	}

	hash := hashPassword(body.Password)
	items := s.store.listByPasswordHash(hash)
	if len(items) == 0 {
		writeError(w, http.StatusNotFound, "没有找到该密码对应的内容")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"token": s.store.issueToken(hash),
		"items": items,
	})
}

func (s *server) handleCreateItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+maxMultipartMemory)

	if err := r.ParseMultipartForm(maxMultipartMemory); err != nil {
		writeError(w, http.StatusBadRequest, "上传内容过大或格式不正确")
		return
	}
	defer func() {
		if r.MultipartForm != nil {
			if err := r.MultipartForm.RemoveAll(); err != nil {
				log.Printf("warning: could not clean multipart temp files: %v", err)
			}
		}
	}()

	kind := strings.TrimSpace(r.FormValue("kind"))
	password := r.FormValue("password")
	title := strings.TrimSpace(r.FormValue("title"))
	expiresHours := sanitizeHours(r.FormValue("expiresHours"))

	now := time.Now().UTC()
	base := item{
		ID:        newID(),
		Title:     title,
		CreatedAt: now.Format(jsTimeLayout),
		ExpiresAt: now.Add(time.Duration(expiresHours) * time.Hour).Format(jsTimeLayout),
	}
	if password != "" {
		base.PasswordHash = hashPassword(password)
	}

	switch kind {
	case "text":
		text := r.FormValue("text")
		if strings.TrimSpace(text) == "" {
			writeError(w, http.StatusBadRequest, "文本内容不能为空")
			return
		}
		base.Kind = "text"
		base.Text = text

	case "image", "file":
		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, http.StatusBadRequest, "请上传文件")
			return
		}
		defer file.Close()

		mimeType := header.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = mime.TypeByExtension(filepath.Ext(header.Filename))
		}
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}

		stored := fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), newID(), filepath.Ext(header.Filename))
		dest := filepath.Join(s.store.dir, "uploads", stored)

		written, err := copyToFile(dest, file)
		if err != nil {
			_ = os.Remove(dest)
			writeError(w, http.StatusInternalServerError, "保存文件失败")
			return
		}

		resolved := "file"
		if kind == "image" || strings.HasPrefix(mimeType, "image/") {
			resolved = "image"
		}
		base.Kind = resolved
		base.MimeType = mimeType
		base.OriginalName = filepath.Base(header.Filename)
		base.Size = written
		base.StoredName = stored

	default:
		writeError(w, http.StatusBadRequest, "无效的内容类型")
		return
	}

	if err := s.store.add(base); err != nil {
		if base.StoredName != "" {
			_ = os.Remove(filepath.Join(s.store.dir, "uploads", base.StoredName))
		}
		writeError(w, http.StatusInternalServerError, "保存失败")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{"item": base.public()})
}

func (s *server) handleContent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	it, ok := s.store.findByID(id)
	if !ok {
		writeError(w, http.StatusNotFound, "内容不存在或已过期")
		return
	}
	if !s.ensureAccess(r, it) {
		writeError(w, http.StatusForbidden, "需要密码访问")
		return
	}

	switch it.Kind {
	case "text":
		writeJSON(w, http.StatusOK, map[string]string{"id": it.ID, "kind": it.Kind, "text": it.Text})

	case "image":
		raw, err := os.ReadFile(filepath.Join(s.store.dir, "uploads", it.StoredName))
		if err != nil {
			writeError(w, http.StatusNotFound, "内容不存在或已过期")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"id":       it.ID,
			"kind":     it.Kind,
			"mimeType": it.MimeType,
			"dataUrl":  fmt.Sprintf("data:%s;base64,%s", it.MimeType, base64Encode(raw)),
		})

	default:
		writeError(w, http.StatusBadRequest, "该类型不支持内容预览")
	}
}

func (s *server) handleDownload(w http.ResponseWriter, r *http.Request) {
	it, ok := s.store.findByID(r.PathValue("id"))
	if !ok || it.StoredName == "" {
		writeError(w, http.StatusNotFound, "文件不存在或已过期")
		return
	}
	if !s.ensureAccess(r, it) {
		writeError(w, http.StatusForbidden, "需要密码访问")
		return
	}

	abs := filepath.Join(s.store.dir, "uploads", it.StoredName)
	name := it.OriginalName
	if name == "" {
		name = it.StoredName
	}
	w.Header().Set("Content-Disposition", contentDisposition(name))
	if it.MimeType != "" {
		w.Header().Set("Content-Type", it.MimeType)
	}
	http.ServeFile(w, r, abs)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func newID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		panic(fmt.Sprintf("rand: %v", err))
	}
	// RFC 4122 version 4 layout.
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16])
}

func copyToFile(dest string, src io.Reader) (int64, error) {
	out, err := os.Create(dest)
	if err != nil {
		return 0, err
	}
	defer out.Close()
	return io.Copy(out, src)
}

// contentDisposition builds a RFC 5987 compatible attachment header that keeps
// non-ASCII file names intact.
func contentDisposition(name string) string {
	ascii := strings.Map(func(r rune) rune {
		if r < 32 || r > 126 || r == '"' || r == '\\' {
			return '_'
		}
		return r
	}, name)
	return fmt.Sprintf("attachment; filename=%q; filename*=UTF-8''%s", ascii, urlEscape(name))
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

func resolveDataDir() string {
	if dir := strings.TrimSpace(os.Getenv("UGAPP_DATA_DIR")); dir != "" {
		return dir
	}
	if dir := strings.TrimSpace(os.Getenv("TEMPCLOUD_DATA_DIR")); dir != "" {
		return dir
	}
	// Fallback for standalone use: ./data next to the process working directory.
	return "data"
}

func resolvePort() int {
	if raw := strings.TrimSpace(os.Getenv("PORT")); raw != "" {
		if port, err := strconv.Atoi(raw); err == nil && port > 0 && port < 65536 {
			return port
		}
	}
	return 0
}

func main() {
	portFlag := flag.Int("port", 0, "port to listen on (overrides PORT; default 3000)")
	flag.Parse()

	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	dataDir := resolveDataDir()
	if abs, err := filepath.Abs(dataDir); err == nil {
		dataDir = abs
	}

	st, err := newStore(dataDir)
	if err != nil {
		log.Fatalf("temp-cloud: cannot initialise data directory %s: %v", dataDir, err)
	}

	port := *portFlag
	if port == 0 {
		port = resolvePort()
	}
	if port == 0 {
		port = 3000
	}

	srv := &server{store: st}
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/config", srv.handleConfig)
	mux.HandleFunc("GET /healthz", srv.handleHealth)
	mux.HandleFunc("GET /api/items/public", srv.handlePublicItems)
	mux.HandleFunc("POST /api/access", srv.handleAccess)
	mux.HandleFunc("POST /api/items", srv.handleCreateItem)
	mux.HandleFunc("GET /api/items/{id}/content", srv.handleContent)
	mux.HandleFunc("GET /api/files/{id}", srv.handleDownload)

	webRoot, err := fs.Sub(embeddedWeb, "web")
	if err != nil {
		log.Fatalf("temp-cloud: embedded web assets unavailable: %v", err)
	}
	fileServer := http.FileServer(http.FS(webRoot))
	mux.Handle("/", cacheControl(fileServer))

	httpServer := &http.Server{
		Addr:              fmt.Sprintf("0.0.0.0:%d", port),
		Handler:           requestLogger(mux),
		ReadHeaderTimeout: 20 * time.Second,
	}

	// Periodic expiry sweep.
	sweepDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(cleanupInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				st.cleanupExpired()
			case <-sweepDone:
				return
			}
		}
	}()
	st.cleanupExpired()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("temp-cloud starting: port=%d data=%s", port, dataDir)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		log.Fatalf("temp-cloud: server error: %v", err)
	case sig := <-stop:
		log.Printf("temp-cloud: received %s, shutting down", sig)
	}

	close(sweepDone)

	ctx, cancel := contextWithTimeout(shutdownGrace)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("temp-cloud: forced shutdown: %v", err)
	}
	log.Printf("temp-cloud: stopped")
}
