namespace ChurchAudio.Api.Models;

// Public read-only key given to the embeddable widget
public class ApiKey
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = string.Empty;  // e.g. pk_live_xxxxx
    public string Label { get; set; } = string.Empty; // e.g. "Main Website"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
