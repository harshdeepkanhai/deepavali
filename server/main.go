// Command server serves the built game and its small JSON API from one origin.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func newApp(cfg config, log *slog.Logger) (*app, error) {
	files, err := loadStatic(cfg.StaticDir)
	if err != nil {
		return nil, err
	}
	a := &app{cfg: cfg, log: log, files: files, api: http.NewServeMux(), lim: defaultLimiters()}
	a.csp = a.buildCSP()
	return a, nil
}

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	cfg, err := loadConfig()
	if err != nil {
		log.Error("config", "err", err.Error())
		os.Exit(1)
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	a, err := newApp(cfg, log)
	if err != nil {
		log.Error("start", "err", err.Error())
		os.Exit(1)
	}
	go a.janitor(ctx)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           a,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 << 10,
		ErrorLog:          slog.NewLogLogger(log.Handler(), slog.LevelWarn),
	}
	go func() {
		<-ctx.Done()
		shut, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shut)
	}()
	log.Info("ready")
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("serve", "err", err.Error())
		os.Exit(1)
	}
}

// janitor forgets idle rate-limit entries. Later steps also expire old sessions here.
func (a *app) janitor(ctx context.Context) {
	t := time.NewTicker(time.Minute)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			for _, l := range a.lim {
				l.sweep()
			}
		}
	}
}
