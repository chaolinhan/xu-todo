# Static files only. Task data is kept by the browser, never by this server.
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'app'))
$port = 4178
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
try { $listener.Start() } catch { Write-Host "Port $port is in use. Close another Xiaoxu window/server, then retry."; exit 1 }
$url = "http://127.0.0.1:$port/"
Write-Host "Xiaoxu offline web app: $url"
Write-Host 'Keep this window open. Press Ctrl+C to stop. Internet and Node.js are not required.'
Start-Process $url
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript'; '.css'='text/css'; '.svg'='image/svg+xml'; '.png'='image/png'; '.woff2'='font/woff2'; '.webmanifest'='application/manifest+json'; '.json'='application/json' }
try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $request = $reader.ReadLine()
      if (-not $request) { continue }
      $parts = $request.Split(' ')
      $line = $reader.ReadLine(); $headerBytes = 0
      while ($line) { $headerBytes += $line.Length; if ($headerBytes -gt 16384) { throw 'Request headers too large' }; $line = $reader.ReadLine() }
      $status = '200 OK'; $contentType = 'text/plain'; $bytes = [byte[]]@()
      if ($parts[0] -notin @('GET', 'HEAD')) { $status = '405 Method Not Allowed' }
      else {
        $relative = [Uri]::UnescapeDataString($parts[1].Split('?')[0]).TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        if (-not $relative) { $relative = 'index.html' }
        $path = [IO.Path]::GetFullPath((Join-Path $root $relative))
        if (-not $path.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { $status = '403 Forbidden' }
        elseif (-not [IO.File]::Exists($path)) { $status = '404 Not Found' }
        else { $bytes = [IO.File]::ReadAllBytes($path); $ext = [IO.Path]::GetExtension($path); if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] } else { $contentType = 'application/octet-stream' } }
      }
      $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`nX-Content-Type-Options: nosniff`r`n`r`n"
      $buffer = [Text.Encoding]::ASCII.GetBytes($headers); $stream.Write($buffer, 0, $buffer.Length)
      if ($parts[0] -eq 'GET' -and $bytes.Length) { $stream.Write($bytes, 0, $bytes.Length) }
      $reader.Dispose()
    } catch { Write-Host "Request ended: $($_.Exception.Message)" }
    finally { $client.Close() }
  }
} finally { $listener.Stop() }
