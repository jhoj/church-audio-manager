namespace ChurchAudio.Api.Models;

public enum AudioType { Sermon, Worship, Podcast, Announcement }

public class AudioTrack
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public AudioType Type { get; set; }
    public string? Description { get; set; }
    public DateTime RecordedAt { get; set; }
    public int? DurationSeconds { get; set; }

    // Stored in MinIO; this is the object key
    public string FileKey { get; set; } = string.Empty;

    // Tags stored as comma-separated string; simple and EF-friendly
    public string? Tags { get; set; }

    public Guid? SpeakerId { get; set; }
    public Speaker? Speaker { get; set; }

    public Guid? SeriesId { get; set; }
    public Series? Series { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPublished { get; set; } = false;
}
