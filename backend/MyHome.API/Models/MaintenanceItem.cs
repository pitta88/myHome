namespace MyHome.API.Models;

public class MaintenanceItem
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? IntervalDays { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<MaintenanceLog> Logs { get; set; } = new List<MaintenanceLog>();
}
