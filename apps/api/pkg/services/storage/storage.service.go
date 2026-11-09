package storage

import (
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
	"go.uber.org/fx"
)

// allowedTypes maps the file extensions the internal tools accept onto the
// Content-Type the presigned PUT is signed for. Anything else is refused.
var allowedTypes = map[string]string{
	".pdf":  "application/pdf",
	".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".webp": "image/webp",
}

// Upload errors.
var (
	// ErrFileTypeNotAllowed is returned for an extension outside allowedTypes.
	ErrFileTypeNotAllowed = errors.New("ชนิดไฟล์นี้อัปโหลดไม่ได้ (รับ pdf, docx, xlsx, pptx, jpg, png, webp)")
	// ErrFileTooLarge is returned when the declared or actual size is over the cap.
	ErrFileTooLarge = errors.New("ไฟล์ใหญ่เกินกำหนด")
)

// Service is the R2 gateway.
type Service struct {
	client  *s3.Client
	presign *s3.PresignClient
	config  core.R2Config
}

// New builds the storage service.
func New(config core.Config, client *s3.Client) *Service {
	return &Service{
		client:  client,
		presign: s3.NewPresignClient(client),
		config:  config.R2,
	}
}

// Module is the FX wiring for the R2 client and the storage service.
var Module = fx.Module("services.storage",
	fx.Provide(NewR2Client),
	fx.Provide(New),
)

// AllowedExtensions lists the accepted extensions, for error messages and docs.
func AllowedExtensions() []string {
	out := make([]string, 0, len(allowedTypes))
	for ext := range allowedTypes {
		out = append(out, ext)
	}
	return out
}

// MaxUploadBytes is the configured per-file cap.
func (s *Service) MaxUploadBytes() int64 { return s.config.MaxUploadBytes }

// PresignExpiry is how long a presigned URL stays valid.
func (s *Service) PresignExpiry() time.Duration { return s.config.PresignExpiry }

// ResolveContentType validates the filename and returns the Content-Type the
// upload must be sent with.
func (s *Service) ResolveContentType(filename string) (string, error) {
	ext := strings.ToLower(path.Ext(filename))
	mime, ok := allowedTypes[ext]
	if !ok {
		return "", ErrFileTypeNotAllowed
	}
	return mime, nil
}

// CheckSize validates a declared file size against the cap.
func (s *Service) CheckSize(size int64) error {
	if size <= 0 {
		return errors.New("ขนาดไฟล์ไม่ถูกต้อง")
	}
	if size > s.config.MaxUploadBytes {
		return fmt.Errorf("%w (สูงสุด %d MB)", ErrFileTooLarge, s.config.MaxUploadBytes/(1024*1024))
	}
	return nil
}

// BuildKey returns the R2 object key for an attachment. The random prefix keeps
// two files of the same name apart and makes keys unguessable.
func (s *Service) BuildKey(ownerType string, ownerID uint, filename string) string {
	ext := strings.ToLower(path.Ext(filename))
	return fmt.Sprintf("%s/%d/%s%s", ownerType, ownerID, uuid.NewString(), ext)
}

// PresignUpload returns a short-lived PUT URL for the browser to upload to.
//
// Content-Length is deliberately not signed: the browser would have to match it
// byte for byte, and the real size is verified against the cap in Confirm.
func (s *Service) PresignUpload(ctx context.Context, key, contentType string) (string, time.Time, error) {
	out, err := s.presign.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.config.FileBucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(s.config.PresignExpiry))
	if err != nil {
		return "", time.Time{}, err
	}
	return out.URL, time.Now().Add(s.config.PresignExpiry), nil
}

// PresignDownload returns a short-lived GET URL. The original filename is set
// as the download name so the browser does not save the random key.
func (s *Service) PresignDownload(ctx context.Context, key, filename string) (string, time.Time, error) {
	disposition := fmt.Sprintf("attachment; filename*=UTF-8''%s", encodeFilename(filename))
	out, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(s.config.FileBucket),
		Key:                        aws.String(key),
		ResponseContentDisposition: aws.String(disposition),
	}, s3.WithPresignExpires(s.config.PresignExpiry))
	if err != nil {
		return "", time.Time{}, err
	}
	return out.URL, time.Now().Add(s.config.PresignExpiry), nil
}

// PresignInline returns a short-lived GET URL for viewing in the browser
// (used for image previews on the lead detail screen).
func (s *Service) PresignInline(ctx context.Context, key string) (string, time.Time, error) {
	out, err := s.presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.config.FileBucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(s.config.PresignExpiry))
	if err != nil {
		return "", time.Time{}, err
	}
	return out.URL, time.Now().Add(s.config.PresignExpiry), nil
}

// Stat reads the object's real size and type after an upload.
func (s *Service) Stat(ctx context.Context, key string) (int64, string, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.config.FileBucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return 0, "", err
	}
	size := int64(0)
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	mime := ""
	if out.ContentType != nil {
		mime = *out.ContentType
	}
	return size, mime, nil
}

// Delete removes the object from R2.
func (s *Service) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.config.FileBucket),
		Key:    aws.String(key),
	})
	return err
}

// encodeFilename percent-encodes a filename for Content-Disposition (RFC 5987),
// so Thai filenames survive the round trip.
func encodeFilename(name string) string {
	const hex = "0123456789ABCDEF"
	var b strings.Builder
	for _, c := range []byte(name) {
		isUnreserved := (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '-' || c == '.' || c == '_' || c == '~'
		if isUnreserved {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(hex[c>>4])
		b.WriteByte(hex[c&0x0f])
	}
	return b.String()
}
