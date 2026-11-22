[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.RandomAccessStreamReference, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asStreamMethod = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStream', [Type[]]@([Windows.Storage.Streams.IRandomAccessStream]))

$asTaskMethod = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Wait-WinRT($operation, [Type]$resultType) {
    $task = $asTaskMethod.MakeGenericMethod($resultType).Invoke($null, @($operation))
    $null = $task.Wait(-1)
    return $task.Result
}

function Get-ActiveSession {
    foreach ($session in $manager.GetSessions()) {
        if ($session.GetPlaybackInfo().PlaybackStatus -eq 'Playing') {
            return $session
        }
    }
    return $manager.GetCurrentSession()
}

function Read-Cover($properties) {
    if ($null -eq $properties.Thumbnail) {
        return $null
    }
    try {
        $winrtStream = Wait-WinRT ($properties.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $netStream = $asStreamMethod.Invoke($null, @($winrtStream))
        $netStream.Position = 0
        $memory = New-Object System.IO.MemoryStream
        $netStream.CopyTo($memory)
        $netStream.Position = 0
        $bytes = $memory.ToArray()
        if ($bytes.Length -eq 0) {
            return $null
        }
        $contentType = 'image/jpeg'
        if ($bytes[0] -eq 137) {
            $contentType = 'image/png'
        }
        return "data:$contentType;base64," + [Convert]::ToBase64String($bytes)
    }
    catch {
        return $null
    }
}

$manager = Wait-WinRT ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
$stdin = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$pendingCommand = $stdin.ReadLineAsync()
$lastOutput = ''
$coverTrack = ''
$cover = $null

while ($true) {
    $session = Get-ActiveSession

    if ($pendingCommand.IsCompleted) {
        $command = $pendingCommand.Result
        if ($null -eq $command) {
            exit
        }
        if ($null -ne $session) {
            if ($command -eq 'toggle') { $null = $session.TryTogglePlayPauseAsync() }
            if ($command -eq 'next') { $null = $session.TrySkipNextAsync() }
            if ($command -eq 'previous') { $null = $session.TrySkipPreviousAsync() }
        }
        $pendingCommand = $stdin.ReadLineAsync()
    }

    $output = 'null'
    if ($null -ne $session) {
        $properties = Wait-WinRT ($session.TryGetMediaPropertiesAsync()) $propertiesType
        $track = $properties.Title + '|' + $properties.Artist
        if ($track -ne $coverTrack) {
            $coverTrack = $track
            $cover = $null
        }
        if ($null -eq $cover) {
            $cover = Read-Cover $properties
        }
        $isPlaying = $session.GetPlaybackInfo().PlaybackStatus -eq 'Playing'
        $output = [PSCustomObject]@{ title = $properties.Title; artist = $properties.Artist; isPlaying = $isPlaying; cover = $cover } | ConvertTo-Json -Compress
    }

    if ($output -ne $lastOutput) {
        [Console]::Out.WriteLine($output)
        [Console]::Out.Flush()
        $lastOutput = $output
    }

    Start-Sleep -Milliseconds 300
}
