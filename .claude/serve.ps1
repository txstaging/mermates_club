# Minimal static file server for local preview (no Node/Python needed).
param([int]$Port = 5173)
if ($env:PORT) { $Port = [int]$env:PORT }

$root = Split-Path -Parent $PSScriptRoot
$types = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"; ".svg" = "image/svg+xml"
  ".png" = "image/png"; ".mp4" = "video/mp4";".jpg" = "image/jpeg"; ".webp" = "image/webp"; ".ico" = "image/x-icon"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ($rel -eq "") { $rel = "index.html" }
    $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if ($path.StartsWith($root) -and (Test-Path $path -PathType Leaf)) {
      $ext = [IO.Path]::GetExtension($path).ToLower()
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      $ctx.Response.Headers.Add("Cache-Control", "no-store")
      $ctx.Response.Headers.Add("Accept-Ranges", "bytes")
      $fs = [IO.File]::OpenRead($path)
      try {
        # Byte-range support so videos can seek and loop; capped at 4 MB per request.
        $start = 0; $end = $fs.Length - 1
        $range = $ctx.Request.Headers["Range"]
        if ($range -match "bytes=(\d+)-(\d*)") {
          $start = [long]$Matches[1]
          if ($Matches[2]) { $end = [Math]::Min([long]$Matches[2], $end) }
          $end = [Math]::Min($end, $start + 4MB - 1)
          $ctx.Response.StatusCode = 206
          $ctx.Response.Headers.Add("Content-Range", "bytes $start-$end/$($fs.Length)")
        }
        $left = $end - $start + 1
        $ctx.Response.ContentLength64 = $left
        $fs.Position = $start
        $buf = New-Object byte[] 65536
        while ($left -gt 0) {
          $n = $fs.Read($buf, 0, [Math]::Min($buf.Length, $left))
          if ($n -le 0) { break }
          $ctx.Response.OutputStream.Write($buf, 0, $n)
          $left -= $n
        }
      } finally { $fs.Close() }
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch {
    $ctx.Response.StatusCode = 500
  } finally {
    $ctx.Response.Close()
  }
}
