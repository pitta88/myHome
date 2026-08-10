namespace MyHome.API.DTOs;

public class ItemDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string CategoryIcon { get; set; } = string.Empty;
    public string CategoryColor { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? IntervalDays { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogDate { get; set; }
    public DateTime? NextDueDate { get; set; }
    public int? DaysOverdue { get; set; }
    public string DueStatus { get; set; } = "no-logs";
}

public record CreateItemRequest(
    int CategoryId,
    string Name,
    string? Description,
    int? IntervalDays
);

public record UpdateItemRequest(
    int CategoryId,
    string Name,
    string? Description,
    int? IntervalDays,
    bool IsActive
);
