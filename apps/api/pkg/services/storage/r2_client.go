// Package storage talks to Cloudflare R2 over the S3 API. Every byte the
// internal tools accept lands in R2 — nothing is ever written to the Droplet's
// disk, and the buckets are private: browsers use presigned URLs only.
package storage

import (
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/owldayhouse/odh-internal-api/pkg/core"
)

// NewR2Client builds the S3 client pointed at the R2 account endpoint.
func NewR2Client(config core.Config) *s3.Client {
	cfg := aws.Config{
		Region: config.R2.Region,
		Credentials: credentials.NewStaticCredentialsProvider(
			config.R2.AccessKey, config.R2.SecretKey, "",
		),
	}

	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		if config.R2.Endpoint != "" {
			o.BaseEndpoint = aws.String(config.R2.Endpoint)
		}
		// R2 serves the bucket in the path, not as a sub-domain.
		o.UsePathStyle = true
	})
}
