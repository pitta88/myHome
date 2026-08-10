namespace MyHome.API.Models;

public class LogAttachment
{
    public int Id { get; set; }
    public int LogId { get; set; }
    public MaintenanceLog Log { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
