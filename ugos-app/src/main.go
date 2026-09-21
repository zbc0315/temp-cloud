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
	"net"
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
	maxMultipartMemory = 16 << 20  // slack added to the request body limit
	maxFieldBytes      = 20 << 20  // matches the original express.json({limit:"20mb"})
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

// addMany appends every item and persists once.
//
// One submission can produce several items, and persisting each one on its own
// would leave a half-written batch on disk if a later write failed. Appending
// them together and rolling the slice back on error means a batch is either all
// there or not there.
func (s *store) addMany(items []item) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	before := len(s.items)
	s.items = append(s.items, items...)
	if err := s.persist(); err != nil {
		s.items = s.items[:before]
		return err
	}
	return nil
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

// lanAddresses returns this machine's private IPv4 addresses, the most likely
// to be reachable from another device first.
//
// The application is already reachable at whatever address the client used to
// load it, but that is not always a shareable one: the desktop client may reach
// it through the NAS's mDNS name, and .local resolution is not something every
// machine on a LAN has. A numeric address always works.
//
// Docker's default bridge is dropped even though it is private and looks
// plausible, because nothing else on the network can reach it. Among what is
// left, 192.168.x.x sorts first: it is the usual home LAN, while a 10.x address
// is more often a container or VPN bridge.
func lanAddresses() []string {
	found, err := net.InterfaceAddrs()
	if err != nil {
		return []string{}
	}
	addresses := make([]string, 0, len(found))
	for _, entry := range found {
		network, ok := entry.(*net.IPNet)
		if !ok {
			continue
		}
		ip := network.IP.To4()
		if ip == nil || ip.IsLoopback() || ip.IsLinkLocalUnicast() || !ip.IsPrivate() {
			continue
		}
		if ip[0] == 172 && ip[1] == 17 {
			continue // docker0
		}
		addresses = append(addresses, ip.String())
	}
	sort.Slice(addresses, func(i, j int) bool {
		left, right := addressRank(addresses[i]), addressRank(addresses[j])
		if left != right {
			return left < right
		}
		return addresses[i] < addresses[j]
	})
	return addresses
}

func addressRank(address string) int {
	switch {
	case strings.HasPrefix(address, "192.168."):
		return 0
	case strings.HasPrefix(address, "10."):
		return 1
	default:
		return 2
	}
}

func (s *server) handleConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"defaultExpireHours": defaultExpireHours,
		"maxExpireHours":     maxExpireHours,
		"maxUploadBytes":     maxUploadBytes,
		"lanAddresses":       lanAddresses(),
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

// savedFile describes an upload that has already been streamed to disk.
type savedFile struct {
	storedName   string
	originalName string
	mimeType     string
	size         int64
}

// resolveMimeType picks the most useful content type for an upload.
func resolveMimeType(declared, filename string) string {
	if declared != "" {
		return declared
	}
	if byExt := mime.TypeByExtension(filepath.Ext(filename)); byExt != "" {
		return byExt
	}
	return "application/octet-stream"
}

// handleCreateItem accepts a multipart form and streams every file part
// directly to the uploads directory.
//
// One submission can carry any combination of a text and several files. The
// text becomes one item and each file becomes another, and they all share the
// password and the retention the form asked for. That is why the reply lists
// items rather than naming one.
//
// ParseMultipartForm is deliberately avoided. It spills any part larger than
// its in-memory threshold to a temporary file, and the UGOS Pro systemd sandbox
// mounts the root filesystem read-only, so /tmp cannot be written and uploads
// above that threshold fail outright. Streaming removes the temporary-file
// requirement and keeps memory flat regardless of upload size.
func (s *server) handleCreateItem(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes+maxMultipartMemory)

	reader, err := r.MultipartReader()
	if err != nil {
		writeError(w, http.StatusBadRequest, "上传格式不正确")
		return
	}

	fields := make(map[string]string)
	var uploads []savedFile

	// discardUploads removes everything streamed so far, for the paths that fail
	// after one or more files have already landed.
	discardUploads := func() {
		for _, up := range uploads {
			_ = os.Remove(filepath.Join(s.store.dir, "uploads", up.storedName))
		}
		uploads = nil
	}
	tooLarge := func() {
		discardUploads()
		writeError(w, http.StatusRequestEntityTooLarge, "上传内容超过 100 MB 上限")
	}

	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			var maxErr *http.MaxBytesError
			if errors.As(err, &maxErr) {
				tooLarge()
				return
			}
			discardUploads()
			writeError(w, http.StatusBadRequest, "上传内容读取失败")
			return
		}

		name := part.FormName()
		if name != "file" {
			value, readErr := io.ReadAll(io.LimitReader(part, maxFieldBytes+1))
			part.Close()
			if readErr != nil {
				discardUploads()
				writeError(w, http.StatusBadRequest, "上传内容读取失败")
				return
			}
			if int64(len(value)) > maxFieldBytes {
				discardUploads()
				writeError(w, http.StatusRequestEntityTooLarge, "表单字段超过 20 MB 上限")
				return
			}
			fields[name] = string(value)
			continue
		}

		original := filepath.Base(part.FileName())
		stored := fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), newID(), filepath.Ext(original))
		dest := filepath.Join(s.store.dir, "uploads", stored)

		written, copyErr := copyToFile(dest, part)
		declared := part.Header.Get("Content-Type")
		part.Close()
		if copyErr != nil {
			_ = os.Remove(dest)
			var maxErr *http.MaxBytesError
			if errors.As(copyErr, &maxErr) {
				tooLarge()
				return
			}
			discardUploads()
			writeError(w, http.StatusInternalServerError, "保存文件失败")
			return
		}

		uploads = append(uploads, savedFile{
			storedName:   stored,
			originalName: original,
			mimeType:     resolveMimeType(declared, original),
			size:         written,
		})
	}

	text := fields["text"]
	password := fields["password"]
	title := strings.TrimSpace(fields["title"])
	expiresHours := sanitizeHours(fields["expiresHours"])

	hasText := strings.TrimSpace(text) != ""
	if !hasText && len(uploads) == 0 {
		writeError(w, http.StatusBadRequest, "请上传文件或填写文本")
		return
	}

	now := time.Now().UTC()
	createdAt := now.Format(jsTimeLayout)
	expiresAt := now.Add(time.Duration(expiresHours) * time.Hour).Format(jsTimeLayout)

	// The title names a single payload. Across several it would have to either
	// replace every filename or be dropped, and losing three filenames to one
	// label is worse than ignoring the label, so files keep their own names
	// unless a file is the only thing being sent.
	fileTitle := ""
	if len(uploads) == 1 && !hasText {
		fileTitle = title
	}

	batch := make([]item, 0, len(uploads)+1)

	if hasText {
		batch = append(batch, item{
			ID:        newID(),
			Kind:      "text",
			Title:     title,
			Text:      text,
			CreatedAt: createdAt,
			ExpiresAt: expiresAt,
		})
	}

	for _, up := range uploads {
		kind := "file"
		if strings.HasPrefix(up.mimeType, "image/") {
			kind = "image"
		}
		batch = append(batch, item{
			ID:           newID(),
			Kind:         kind,
			Title:        fileTitle,
			MimeType:     up.mimeType,
			OriginalName: up.originalName,
			Size:         up.size,
			StoredName:   up.storedName,
			CreatedAt:    createdAt,
			ExpiresAt:    expiresAt,
		})
	}

	if password != "" {
		hash := hashPassword(password)
		for i := range batch {
			batch[i].PasswordHash = hash
		}
	}

	if err := s.store.addMany(batch); err != nil {
		discardUploads()
		writeError(w, http.StatusInternalServerError, "保存失败")
		return
	}

	created := make([]publicItem, 0, len(batch))
	for _, it := range batch {
		created = append(created, it.public())
	}
	writeJSON(w, http.StatusCreated, map[string]any{"items": created})
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
