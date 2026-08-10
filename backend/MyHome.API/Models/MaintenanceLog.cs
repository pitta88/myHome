namespace MyHome.API.Models;

public class MaintenanceLog
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public MaintenanceItem Item { get; set; } = null!;
    public DateTime LogDate { get; set; }
    public string? Notes { get; set; }
    public decimal? Cost { get; set; }
    public string? ProductUsed { get; set; }
    public string? PhotoPath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<LogAttachment> Attachments { get; set; } = new();
}
