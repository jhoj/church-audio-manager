using ChurchAudio.Api.Data;
using ChurchAudio.Api.Models;
using ChurchAudio.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ChurchAudio.Api.Endpoints;

public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/public")
            .AddEndpointFilter<ApiKeyFilter>();

        // Tracks — list with optional filtering
        group.MapGet("/tracks", async (
            AppDbContext db,
            HttpContext ctx,
            AudioType? type,
            Guid? speakerId,
            Guid? seriesId,
            string? tag,
            int page = 1,
            int pageSize = 20) =>
        {
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = db.AudioTracks
                .Where(t => t.IsPublished)
                .Include(t => t.Speaker)
                .Include(t => t.Series)
                .AsQueryable();

            if (type.HasValue) query = query.Where(t => t.Type == type.Value);
            if (speakerId.HasValue) query = query.Where(t => t.SpeakerId == speakerId);
            if (seriesId.HasValue) query = query.Where(t => t.SeriesId == seriesId);
            if (!string.IsNullOrWhiteSpace(tag)) query = query.Where(t => t.Tags != null && t.Tags.Contains(tag));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(t => t.RecordedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // Stream URL is permanent — no expiry, no MinIO URL leak.
            // The API key goes in the query string so <audio src="..."> works without custom headers.
            var apiKey = ctx.Request.Headers["X-Api-Key"].ToString()
                         ?? ctx.Request.Query["api_key"].ToString();

            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";

            var results = items.Select(t => new
            {
                t.Id, t.Title, t.Type, t.Description, t.RecordedAt, t.DurationSeconds, t.Tags,
                StreamUrl = $"{baseUrl}/api/public/tracks/{t.Id}/stream?api_key={apiKey}",
                Speaker = t.Speaker is null ? null : new { t.Speaker.Id, t.Speaker.Name, t.Speaker.PhotoUrl },
                Series = t.Series is null ? null : new { t.Series.Id, t.Series.Title, t.Series.CoverUrl }
            });

            return Results.Ok(new { total, page, pageSize, items = results });
        });

        // Single track metadata
        group.MapGet("/tracks/{id:guid}", async (Guid id, AppDbContext db, HttpContext ctx) =>
        {
            var track = await db.AudioTracks
                .Include(t => t.Speaker)
                .Include(t => t.Series)
                .FirstOrDefaultAsync(t => t.Id == id && t.IsPublished);

            if (track is null) return Results.NotFound();

            var apiKey = ctx.Request.Headers["X-Api-Key"].ToString()
                         ?? ctx.Request.Query["api_key"].ToString();
            var baseUrl = $"{ctx.Request.Scheme}://{ctx.Request.Host}";

            return Results.Ok(new
            {
                track.Id, track.Title, track.Type, track.Description,
                track.RecordedAt, track.DurationSeconds, track.Tags,
                StreamUrl = $"{baseUrl}/api/public/tracks/{track.Id}/stream?api_key={apiKey}",
                Speaker = track.Speaker is null ? null : new { track.Speaker.Id, track.Speaker.Name, track.Speaker.PhotoUrl },
                Series = track.Series is null ? null : new { track.Series.Id, track.Series.Title, track.Series.CoverUrl }
            });
        });

        // Speakers
        group.MapGet("/speakers", async (AppDbContext db) =>
            Results.Ok(await db.Speakers.OrderBy(s => s.Name).Select(s => new
            {
                s.Id, s.Name, s.Bio, s.PhotoUrl
            }).ToListAsync()));

        // Series
        group.MapGet("/series", async (AppDbContext db) =>
            Results.Ok(await db.Series.OrderBy(s => s.Title).Select(s => new
            {
                s.Id, s.Title, s.Description, s.CoverUrl
            }).ToListAsync()));

        // ── Audio stream ─────────────────────────────────────────────────────────
        // This endpoint is intentionally outside the ApiKeyFilter group so that
        // browsers can set <audio src="/api/public/tracks/{id}/stream?api_key=pk_live_xxx">
        // without needing to set custom headers (which HTMLMediaElement cannot do).
        app.MapGet("/api/public/tracks/{id:guid}/stream", async (
            Guid id,
            string? api_key,
            HttpContext ctx,
            AppDbContext db,
            StorageService storage) =>
        {
            // Accept key from query param OR header (header takes precedence)
            var key = ctx.Request.Headers["X-Api-Key"].FirstOrDefault() ?? api_key;
            if (string.IsNullOrEmpty(key)) return Results.Unauthorized();

            var valid = await db.ApiKeys.AnyAsync(k => k.Key == key && k.IsActive);
            if (!valid) return Results.Unauthorized();

            var track = await db.AudioTracks.FirstOrDefaultAsync(t => t.Id == id && t.IsPublished);
            if (track is null) return Results.NotFound();

            await StreamHelper.WriteAudioResponseAsync(track, ctx, storage);
            return Results.Empty;
        });
    }
}

// Validates the pk_live_ API key on every grouped public request (header or query param)
public class ApiKeyFilter(AppDbContext db) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var key = ctx.HttpContext.Request.Headers["X-Api-Key"].FirstOrDefault()
                  ?? ctx.HttpContext.Request.Query["api_key"].FirstOrDefault();

        if (string.IsNullOrEmpty(key)) return Results.Unauthorized();

        var valid = await db.ApiKeys.AnyAsync(k => k.Key == key && k.IsActive);
        if (!valid) return Results.Unauthorized();

        return await next(ctx);
    }
}
