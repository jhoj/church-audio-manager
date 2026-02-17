using System.Text;
using ChurchAudio.Api.Data;
using ChurchAudio.Api.Endpoints;
using ChurchAudio.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Minio;

var builder = WebApplication.CreateBuilder(args);

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

// ── CORS — allow the widget to call from any website ───────────────────────
builder.Services.AddCors(opt => opt.AddPolicy("widget", p =>
    p.AllowAnyOrigin()     // Public endpoints; API key handles auth
     .WithMethods("GET")
     .WithHeaders("X-Api-Key")));

var app = builder.Build();

app.UseCors("widget");
app.UseAuthentication();
app.UseAuthorization();

// Apply migrations + ensure MinIO bucket on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var storage = scope.ServiceProvider.GetRequiredService<StorageService>();
    await storage.EnsureBucketAsync();
}

app.MapPublicEndpoints();
app.MapAdminEndpoints();

app.Run();
