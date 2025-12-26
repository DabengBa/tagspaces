#!/usr/bin/env bash
set -euo pipefail

# 说明
# - 这是“示例脚本”，用于调试/验证 S3 Presigned URL + SSE-C 下载。
# - 禁止在仓库中提交任何真实的 presigned URL / 加密 key / token。
# - 请通过环境变量注入敏感信息（可配合本地 .env，但不要提交到 git）。
#
# 用法（bash）：
#   export TS_PRESIGNED_URL='https://...'
#   export TS_RAW_ENCRYPTION_KEY='32-byte-raw-key................'
#   ./docs/scripts/get_presigned_url.example.sh > out.bin
#
# 依赖：
#   - curl
#   - openssl

: "${TS_PRESIGNED_URL:?missing env TS_PRESIGNED_URL}"
: "${TS_RAW_ENCRYPTION_KEY:?missing env TS_RAW_ENCRYPTION_KEY}"

ENC_KEY_B64="$(printf %s "$TS_RAW_ENCRYPTION_KEY" | openssl base64 -A)"
ENC_KEY_MD5_B64="$(printf %s "$TS_RAW_ENCRYPTION_KEY" | openssl md5 -binary | openssl base64 -A)"

curl -fsSL "$TS_PRESIGNED_URL" \
  -H "x-amz-server-side-encryption-customer-algorithm: AES256" \
  -H "x-amz-server-side-encryption-customer-key: $ENC_KEY_B64" \
  -H "x-amz-server-side-encryption-customer-key-MD5: $ENC_KEY_MD5_B64"

