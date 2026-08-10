namespace MyHome.API.Models;

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public ICollection<MaintenanceItem> Items { get; set; } = new List<MaintenanceItem>();
}
