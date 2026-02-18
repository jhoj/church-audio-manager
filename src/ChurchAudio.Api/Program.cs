using System.Text;
using System.Text.Json.Serialization;
using ChurchAudio.Api.Data;
using ChurchAudio.Api.Endpoints;
using ChurchAudio.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Minio;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    opt.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// ── Database ────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Postgres")));

// ── MinIO ───────────────────────────────────────────────────────────────────
builder.Services.AddMinio(cfg => cfg
    .WithEndpoint(builder.Configuration["Minio:Endpoint"]!)
    .WithCredentials(
        builder.Configuration["Minio:AccessKey"]!,
        builder.Configuration["Minio:SecretKey"]!)
    .WithSSL(builder.Configuration.GetValue<bool>("Minio:UseSSL")));

builder.Services.AddScoped<StorageService>();
builder.Services.AddScoped<TokenService>();

// ── JWT Auth ─────────────────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.AllowAnyOrigin()
     .AllowAnyMethod()
     .AllowAnyHeader()));

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// Apply migrations + ensure MinIO bucket on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var storage = scope.ServiceProvider.GetRequiredService<StorageService>();
    await storage.EnsureBucketAsync();

    // Seed default admin user if none exists
    if (!await db.AdminUsers.AnyAsync())
    {
        db.AdminUsers.Add(new ChurchAudio.Api.Models.AdminUser
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin")
        });
        await db.SaveChangesAsync();
    }
}

// ── Listener auth ────────────────────────────────────────────────────────────
app.MapPost("/api/listener/login", (ListenerLoginRequest req, IConfiguration config, TokenService tokens) =>
{
    var expected = config["Listener:Password"];
    if (string.IsNullOrEmpty(expected) || req.Password != expected)
        return Results.Json(new { error = "Invalid password" }, statusCode: 401);

    return Results.Ok(new { token = tokens.GenerateListenerToken() });
});

app.MapPublicEndpoints();
app.MapAdminEndpoints();

// ── Audio streaming with Range support ───────────────────────────────────────
app.MapGet("/api/stream/{trackId:guid}", async (Guid trackId, HttpContext http, AppDbContext db, StorageService storage) =>
{
    var track = await db.AudioTracks.FindAsync(trackId);
    if (track is null) return Results.NotFound();

    var (stream, totalSize, contentType) = await storage.GetObjectAsync(track.FileKey);

    var request = http.Request;
    var response = http.Response;

    if (request.Headers.ContainsKey("Range"))
    {
        var rangeHeader = request.Headers.Range.ToString(); // e.g. "bytes=0-1023"
        var range = rangeHeader.Replace("bytes=", "").Split('-');
        var start = long.Parse(range[0]);
        var end = range.Length > 1 && !string.IsNullOrEmpty(range[1]) ? long.Parse(range[1]) : totalSize - 1;
        var chunkSize = end - start + 1;

        response.StatusCode = 206;
        response.Headers.ContentRange = $"bytes {start}-{end}/{totalSize}";
        response.Headers.AcceptRanges = "bytes";
        response.ContentType = contentType;
        response.ContentLength = chunkSize;

        stream.Seek(start, SeekOrigin.Begin);
        var buffer = new byte[chunkSize];
        await stream.ReadExactlyAsync(buffer, 0, (int)chunkSize);
        await response.Body.WriteAsync(buffer);
        stream.Dispose();
        return Results.Empty;
    }

    response.Headers.AcceptRanges = "bytes";
    response.ContentType = contentType;
    response.ContentLength = totalSize;
    await stream.CopyToAsync(response.Body);
    stream.Dispose();
    return Results.Empty;
});

app.Run();

record ListenerLoginRequest(string Password);
