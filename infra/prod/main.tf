provider "aws" {
  region = "eu-west-1"
}

terraform {
  backend "s3" {
    region = "eu-west-1"
    key = "frontend.tfstate"
    bucket = "tfstate-arup-speckleverse-hackathon"
  }
}

module "static-pages" {
  source = "../modules/static-pages"
  sub_domain = "parameters"

}