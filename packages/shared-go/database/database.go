package database

import (
	"context"
	"errors"
	"fmt"
	stdlog "log"
	"os"
	"time"

	appLogger "ecommerce-platform/packages/shared-go/logger"
	"ecommerce-platform/packages/shared-go/metrics"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

type Config struct {
	Host        string
	Port        string
	User        string
	Password    string
	DBName      string
	SSLMode     string
	ServiceName string
}

// slowQueryLogger intercepts queries and ships structured warnings/errors to Loki and Prometheus
type slowQueryLogger struct {
	base        gormLogger.Interface
	serviceName string
}

func (l *slowQueryLogger) LogMode(level gormLogger.LogLevel) gormLogger.Interface {
	return &slowQueryLogger{base: l.base.LogMode(level), serviceName: l.serviceName}
}

func (l *slowQueryLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	l.base.Info(ctx, msg, data...)
}

func (l *slowQueryLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	l.base.Warn(ctx, msg, data...)
}

func (l *slowQueryLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	l.base.Error(ctx, msg, data...)
}

func (l *slowQueryLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rowsAffected int64), err error) {
	elapsed := time.Since(begin)
	svc := l.serviceName
	if svc == "" {
		svc = "database"
	}

	if elapsed >= 8*time.Second {
		sql, rows := fc()
		log := appLogger.New(svc)
		msg := fmt.Sprintf("[CRITICAL SLOW DB QUERY > 8s] [%.2fs, rows: %d] %s", elapsed.Seconds(), rows, sql)
		log.ErrorContext(ctx, msg,
			"duration_ms", elapsed.Milliseconds(),
			"rows", rows,
			"slow_query", true,
			"severity", "critical",
		)
		metrics.RecordSlowQuery(svc, "critical")
	} else if elapsed >= 5*time.Second {
		sql, rows := fc()
		log := appLogger.New(svc)
		msg := fmt.Sprintf("[SLOW DB QUERY WARNING > 5s] [%.2fs, rows: %d] %s", elapsed.Seconds(), rows, sql)
		log.WarnContext(ctx, msg,
			"duration_ms", elapsed.Milliseconds(),
			"rows", rows,
			"slow_query", true,
			"severity", "warning",
		)
		metrics.RecordSlowQuery(svc, "warning")
	} else if elapsed >= 200*time.Millisecond {
		sql, rows := fc()
		log := appLogger.New(svc)
		msg := fmt.Sprintf("[SLOW DB QUERY >= 200ms] [%.2fs, rows: %d] %s", elapsed.Seconds(), rows, sql)
		log.WarnContext(ctx, msg,
			"duration_ms", elapsed.Milliseconds(),
			"rows", rows,
			"slow_query", true,
			"severity", "slow",
		)
	}

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		sql, rows := fc()
		log := appLogger.New(svc)
		log.ErrorContext(ctx, fmt.Sprintf("[DB ERROR] %v | %s", err, sql),
			"error", err.Error(),
			"rows", rows,
		)
	}

	l.base.Trace(ctx, begin, fc, err)
}

func NewPostgresDB(cfg Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	baseGormLogger := gormLogger.New(
		stdlog.New(os.Stdout, "\r\n", stdlog.LstdFlags),
		gormLogger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  gormLogger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	svc := cfg.ServiceName
	if svc == "" {
		svc = cfg.DBName
	}
	customLogger := &slowQueryLogger{
		base:        baseGormLogger,
		serviceName: svc,
	}

	db, err := gorm.Open(postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true, // Required for PgBouncer transaction pooling mode
	}), &gorm.Config{
		PrepareStmt: false, // Required for PgBouncer transaction mode
		Logger:      customLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func NewTestDB() (*gorm.DB, error) {
	return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Silent),
	})
}
