
provider "aws" {
  region = "us-east-1"
  alias = "us_east_1"
}

data "aws_route53_zone" "zone" {
  name = "speckle.arup.com"
}

resource "aws_acm_certificate" "mycert" {
  provider = aws.us_east_1
  domain_name       = "${var.sub_domain}.${data.aws_route53_zone.zone.name}"
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.mycert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  name    = each.value.name
  type    = each.value.type
  zone_id = data.aws_route53_zone.zone.id
  records = [each.value.record]
  ttl     = 60
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "cert" {
  provider = aws.us_east_1
  for_each = aws_route53_record.cert_validation
  certificate_arn         = aws_acm_certificate.mycert.arn
  validation_record_fqdns = [aws_route53_record.cert_validation[each.key].fqdn]
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cname_route53_record" {
  zone_id = data.aws_route53_zone.zone.id
  name    = "${var.sub_domain}.${data.aws_route53_zone.zone.name}" # Replace with your subdomain, Note: not valid with "apex" domains, e.g. example.com
  type    = "A"
  alias {
    name = aws_cloudfront_distribution.s3_distribution.domain_name
    zone_id = aws_cloudfront_distribution.s3_distribution.hosted_zone_id
    evaluate_target_health = false
  }
 lifecycle {
    create_before_destroy = true
  }
}