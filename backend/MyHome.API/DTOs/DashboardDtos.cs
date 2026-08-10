namespace MyHome.API.DTOs;

public class DashboardDto
{
    public int TotalItems { get; set; }
    public int OverdueCount { get; set; }
    public int DueSoonCount { get; set; }
    public int ThisMonthCompleted { get; set; }
    public List<LogDto> RecentLogs { get; set; } = new();
    public List<ItemDto> OverdueItems { get; set; } = new();
    public List<ItemDto> DueSoonItems { get; set; } = new();
}
