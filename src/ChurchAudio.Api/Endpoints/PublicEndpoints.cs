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
            StorageService storage,
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

            // Attach pre-signed URLs
            var results = await Task.WhenAll(items.Select(async t => new
            {
                t.Id, t.Title, t.Type, t.Description, t.RecordedAt, t.DurationSeconds, t.Tags,
                StreamUrl = await storage.GetPresignedUrlAsync(t.FileKey),
                Speaker = t.Speaker is null ? null : new { t.Speaker.Id, t.Speaker.Name, t.Speaker.PhotoUrl },
                Series = t.Series is null ? null : new { t.Series.Id, t.Series.Title, t.Series.CoverUrl }
            }));

            return Results.Ok(new { total, page, pageSize, items = results });
        });

        // Single track
        group.MapGet("/tracks/{id:guid}", async (Guid id, AppDbContext db, StorageService storage) =>
        {
            var track = await db.AudioTracks
                .Include(t => t.Speaker)
                .Include(t => t.Series)
                .FirstOrDefaultAsync(t => t.Id == id && t.IsPublished);

            if (track is null) return Results.NotFound();

            return Results.Ok(new
            {
                track.Id, track.Title, track.Type, track.Description,
                track.RecordedAt, track.DurationSeconds, track.Tags,
                StreamUrl = await storage.GetPresignedUrlAsync(track.FileKey),
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
    }
}

// Validates the pk_live_ API key on every public request
public class ApiKeyFilter(AppDbContext db) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        if (!ctx.HttpContext.Request.Headers.TryGetValue("X-Api-Key", out var rawKey))
            return Results.Unauthorized();

        var key = rawKey.ToString();
        var valid = await db.ApiKeys.AnyAsync(k => k.Key == key && k.IsActive);
        if (!valid) return Results.Unauthorized();

        return await next(ctx);
    }
}
