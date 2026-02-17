using ChurchAudio.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ChurchAudio.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AudioTrack> AudioTracks => Set<AudioTrack>();
    public DbSet<Speaker> Speakers => Set<Speaker>();
    public DbSet<Series> Series => Set<Series>();
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AudioTrack>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasConversion<string>();
            e.HasOne(x => x.Speaker).WithMany(s => s.Tracks).HasForeignKey(x => x.SpeakerId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Series).WithMany(s => s.Tracks).HasForeignKey(x => x.SeriesId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.IsPublished);
            e.HasIndex(x => x.RecordedAt);
        });

        modelBuilder.Entity<ApiKey>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Key).IsUnique();
        });

        modelBuilder.Entity<AdminUser>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Username).IsUnique();
        });
    }
}
