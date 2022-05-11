variable "environment" {
  type = string
  description = "Environment name"
  default = "prod"
}

variable "sub_domain" {
  type = string
  description = "Subdomain of the root domain"
}