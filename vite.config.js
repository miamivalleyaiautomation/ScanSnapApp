# FILE: netlify.toml  (replace)
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    Permissions-Policy = "camera=(self)"
