using ChurchAudio.Api.Models;
using ChurchAudio.Api.Services;
using Microsoft.Net.Http.Headers;

namespace ChurchAudio.Api.Endpoints;

public static class StreamHelper
{
    // Writes the track's audio into the HTTP response, honouring the Range header.
    // Returns false if the range is unsatisfiable (caller should respond 416).
    public static async Task<bool> WriteAudioResponseAsync(
        AudioTrack track,
        HttpContext ctx,
        StorageService storage)
    {
        var info = await storage.StatAsync(track.FileKey);
        var totalSize = info.Size;

        // Parse Range header — browsers always send "bytes=start-end" or "bytes=start-"
        long start = 0;
        long end = totalSize - 1;
        bool isRange = false;

        var rangeHeader = ctx.Request.Headers.Range.ToString();
        if (!string.IsNullOrEmpty(rangeHeader) && rangeHeader.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
        {
            isRange = true;
            var parts = rangeHeader["bytes=".Length..].Split('-');

            if (!long.TryParse(parts[0], out start)) start = 0;

            if (parts.Length > 1 && long.TryParse(parts[1], out var parsedEnd))
                end = parsedEnd;
            else
                end = totalSize - 1;

            // Clamp
            end = Math.Min(end, totalSize - 1);

            if (start > end || start < 0)
            {
                ctx.Response.StatusCode = 416; // Range Not Satisfiable
                ctx.Response.Headers.ContentRange = $"bytes */{totalSize}";
                return false;
            }
        }

        var length = end - start + 1;

        ctx.Response.StatusCode = isRange ? 206 : 200;
        ctx.Response.Headers.AcceptRanges = "bytes";
        ctx.Response.Headers.ContentLength = length;
        ctx.Response.Headers.ContentType = track.ContentType;

        if (isRange)
            ctx.Response.Headers.ContentRange = $"bytes {start}-{end}/{totalSize}";

        // Disable response buffering — we want to stream directly
        var feature = ctx.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpResponseBodyFeature>();
        feature?.DisableBuffering();

        await storage.StreamRangeAsync(track.FileKey, ctx.Response.Body, start, length, ctx.RequestAborted);
        return true;
    }
}
