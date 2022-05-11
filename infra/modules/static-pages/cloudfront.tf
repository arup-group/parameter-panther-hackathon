resource "aws_cloudfront_origin_access_identity" "access_id" {
  comment = aws_s3_bucket.static_pages.bucket_regional_domain_name
}

resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.static_pages.bucket_regional_domain_name
    origin_id   = aws_s3_bucket.static_pages.bucket_regional_domain_name

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.access_id.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["${var.sub_domain}.speckle.arup.com"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.static_pages.bucket_regional_domain_name

    # AWS managed cache behavior - S3 origin
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    # AWS managed cache behavior - S3 CORS
    origin_request_policy_id = "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf"
    # AWS managed cache behavior - Add secrurity headers
    response_headers_policy_id = "67f7725c-6f97-4210-82d7-5512b31e9d03"

    viewer_protocol_policy = "redirect-to-https"
  }

  viewer_certificate {
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2019"
    acm_certificate_arn      = aws_acm_certificate.mycert.arn
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  custom_error_response {
    error_code = 403
    response_code = 200
    response_page_path = "/index.html"
  }

}