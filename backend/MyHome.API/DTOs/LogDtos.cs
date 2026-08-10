namespace MyHome.API.DTOs;

public class LogAttachmentDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public bool IsImage => MimeType.StartsWith("image/");
}

public class LogDto
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public string ItemName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryColor { get; set; } = string.Empty;
    public DateTime LogDate { get; set; }
    public string? Notes { get; set; }
    public decimal? Cost { get; set; }
    public string? ProductUsed { get; set; }
    public string? PhotoPath { get; set; }
    public List<LogAttachmentDto> Attachments { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

public record CreateLogRequest(
    int ItemId,
    DateTime LogDate,
    string? Notes,
    decimal? Cost,
    string? ProductUsed
);

public record UpdateLogRequest(
    DateTime LogDate,
    string? Notes,
    decimal? Cost,
    string? ProductUsed
);
