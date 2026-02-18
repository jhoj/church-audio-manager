using BCrypt.Net;
using ChurchAudio.Api.Data;
using ChurchAudio.Api.Models;
using ChurchAudio.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ChurchAudio.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        // Auth — no JWT required here
        app.MapPost("/api/admin/auth/login", async (LoginRequest req, AppDbContext db, TokenService tokens) =>
        {
            var user = await db.AdminUsers.FirstOrDefaultAsync(u => u.Username == req.Username);
            if (user is null || !BCrypt.Verify(req.Password, user.PasswordHash))
                return Results.Unauthorized();
            return Results.Ok(new { token = tokens.Generate(user) });
        });

        var admin = app.MapGroup("/api/admin").RequireAuthorization();

        // ── Tracks ──────────────────────────────────────────────────────────────

        admin.MapGet("/tracks", async (AppDbContext db, bool? published, int page = 1, int pageSize = 50) =>
        {
            pageSize = Math.Clamp(pageSize, 1, 100);
            var query = db.AudioTracks
                .Include(t => t.Speaker)
                .Include(t => t.Series)
                .AsQueryable();

            if (published.HasValue) query = query.Where(t => t.IsPublished == published.Value);

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(t => t.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return Results.Ok(new { total, page, pageSize, items });
        });

        admin.MapPost("/tracks", async (CreateTrackRequest req, AppDbContext db) =>
        {
            var track = new AudioTrack
            {
                Title = req.Title,
                Type = req.Type,
                Description = req.Description,
                RecordedAt = req.RecordedAt,
                DurationSeconds = req.DurationSeconds,
                Tags = req.Tags,
                SpeakerId = req.SpeakerId,
                SeriesId = req.SeriesId,
                FileKey = req.FileKey,
                ContentType = req.ContentType ?? "audio/mpeg",
                IsPublished = req.IsPublished
            };
            db.AudioTracks.Add(track);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/tracks/{track.Id}", track);
        });

        admin.MapPut("/tracks/{id:guid}", async (Guid id, UpdateTrackRequest req, AppDbContext db) =>
        {
            var track = await db.AudioTracks.FindAsync(id);
            if (track is null) return Results.NotFound();

            track.Title = req.Title ?? track.Title;
            track.Type = req.Type ?? track.Type;
            track.Description = req.Description ?? track.Description;
            track.RecordedAt = req.RecordedAt ?? track.RecordedAt;
            track.DurationSeconds = req.DurationSeconds ?? track.DurationSeconds;
            track.Tags = req.Tags ?? track.Tags;
            track.SpeakerId = req.SpeakerId ?? track.SpeakerId;
            track.SeriesId = req.SeriesId ?? track.SeriesId;
            track.IsPublished = req.IsPublished ?? track.IsPublished;

            await db.SaveChangesAsync();
            return Results.Ok(track);
        });

        admin.MapDelete("/tracks/{id:guid}", async (Guid id, AppDbContext db, StorageService storage) =>
        {
            var track = await db.AudioTracks.FindAsync(id);
            if (track is null) return Results.NotFound();

            await storage.DeleteAsync(track.FileKey);
            db.AudioTracks.Remove(track);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // Upload audio file — returns fileKey + contentType to use when creating a track
        admin.MapPost("/tracks/upload", async (IFormFile file, StorageService storage) =>
        {
            if (file.Length == 0) return Results.BadRequest("Empty file.");
            using var stream = file.OpenReadStream();
            var key = await storage.UploadAsync(stream, file.FileName, file.ContentType);
            return Results.Ok(new { fileKey = key, contentType = file.ContentType });
        }).DisableAntiforgery();

        // ── Audio stream (admin — JWT required via group) ─────────────────────────
        // Electron injects Authorization automatically via its request interceptor,
        // so Angular can use <audio [src]="streamUrl"> without any extra plumbing.
        admin.MapGet("/tracks/{id:guid}/stream", async (
            Guid id,
            HttpContext ctx,
            AppDbContext db,
            StorageService storage) =>
        {
            var track = await db.AudioTracks.FindAsync(id);
            if (track is null) return Results.NotFound();

            await StreamHelper.WriteAudioResponseAsync(track, ctx, storage);
            return Results.Empty;
        });

        // ── Speakers ────────────────────────────────────────────────────────────

        admin.MapGet("/speakers", async (AppDbContext db) => Results.Ok(await db.Speakers.ToListAsync()));

        admin.MapPost("/speakers", async (SpeakerRequest req, AppDbContext db) =>
        {
            var speaker = new Speaker { Name = req.Name, Bio = req.Bio, PhotoUrl = req.PhotoUrl };
            db.Speakers.Add(speaker);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/speakers/{speaker.Id}", speaker);
        });

        admin.MapPut("/speakers/{id:guid}", async (Guid id, SpeakerRequest req, AppDbContext db) =>
        {
            var speaker = await db.Speakers.FindAsync(id);
            if (speaker is null) return Results.NotFound();
            speaker.Name = req.Name ?? speaker.Name;
            speaker.Bio = req.Bio ?? speaker.Bio;
            speaker.PhotoUrl = req.PhotoUrl ?? speaker.PhotoUrl;
            await db.SaveChangesAsync();
            return Results.Ok(speaker);
        });

        admin.MapDelete("/speakers/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var speaker = await db.Speakers.FindAsync(id);
            if (speaker is null) return Results.NotFound();
            db.Speakers.Remove(speaker);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── Series ──────────────────────────────────────────────────────────────

        admin.MapGet("/series", async (AppDbContext db) => Results.Ok(await db.Series.ToListAsync()));

        admin.MapPost("/series", async (SeriesRequest req, AppDbContext db) =>
        {
            var series = new Series { Title = req.Title, Description = req.Description, CoverUrl = req.CoverUrl };
            db.Series.Add(series);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/series/{series.Id}", series);
        });

        admin.MapPut("/series/{id:guid}", async (Guid id, SeriesRequest req, AppDbContext db) =>
        {
            var series = await db.Series.FindAsync(id);
            if (series is null) return Results.NotFound();
            series.Title = req.Title ?? series.Title;
            series.Description = req.Description ?? series.Description;
            series.CoverUrl = req.CoverUrl ?? series.CoverUrl;
            await db.SaveChangesAsync();
            return Results.Ok(series);
        });

        admin.MapDelete("/series/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var series = await db.Series.FindAsync(id);
            if (series is null) return Results.NotFound();
            db.Series.Remove(series);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // ── API Keys ────────────────────────────────────────────────────────────

        admin.MapGet("/api-keys", async (AppDbContext db) =>
            Results.Ok(await db.ApiKeys.ToListAsync()));

        admin.MapPost("/api-keys", async (ApiKeyRequest req, AppDbContext db) =>
        {
            var key = new ApiKey
            {
                Key = $"pk_live_{Guid.NewGuid():N}",
                Label = req.Label
            };
            db.ApiKeys.Add(key);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/api-keys/{key.Id}", key);
        });

        admin.MapDelete("/api-keys/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var key = await db.ApiKeys.FindAsync(id);
            if (key is null) return Results.NotFound();
            db.ApiKeys.Remove(key);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

record LoginRequest(string Username, string Password);

record CreateTrackRequest(
    string Title, AudioType Type, string? Description,
    DateTime RecordedAt, int? DurationSeconds, string? Tags,
    Guid? SpeakerId, Guid? SeriesId, string FileKey, string? ContentType, bool IsPublished);

record UpdateTrackRequest(
    string? Title, AudioType? Type, string? Description,
    DateTime? RecordedAt, int? DurationSeconds, string? Tags,
    Guid? SpeakerId, Guid? SeriesId, bool? IsPublished);

record SpeakerRequest(string? Name, string? Bio, string? PhotoUrl);

record SeriesRequest(string? Title, string? Description, string? CoverUrl);

record ApiKeyRequest(string Label);
