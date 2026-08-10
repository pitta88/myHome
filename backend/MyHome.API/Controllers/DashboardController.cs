using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.DTOs;

namespace MyHome.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var today = DateTime.UtcNow.Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);

        var items = await _db.MaintenanceItems
            .Include(i => i.Category)
            .Include(i => i.Logs)
            .Where(i => i.IsActive)
            .ToListAsync();

        var itemDtos = items.Select(item =>
        {
            var lastLog = item.Logs.OrderByDescending(l => l.LogDate).FirstOrDefault();
            DateTime? lastLogDate = lastLog?.LogDate;
            DateTime? nextDueDate = null;
            int? daysOverdue = null;
            string dueStatus = "no-logs";

            if (lastLogDate.HasValue && item.IntervalDays.HasValue)
            {
                nextDueDate = lastLogDate.Value.AddDays(item.IntervalDays.Value);
                var diff = (today - nextDueDate.Value).Days;
                if (diff > 0)
                {
                    daysOverdue = diff;
                    dueStatus = "overdue";
                }
                else if (diff >= -7)
                {
                    dueStatus = "due-soon";
                }
                else
                {
                    dueStatus = "ok";
                }
            }
            else if (lastLogDate.HasValue)
            {
                dueStatus = "ok";
            }

            return new ItemDto
            {
                Id = item.Id,
                CategoryId = item.CategoryId,
                CategoryName = item.Category.Name,
                CategoryIcon = item.Category.Icon,
                CategoryColor = item.Category.Color,
                Name = item.Name,
                Description = item.Description,
                IntervalDays = item.IntervalDays,
                IsActive = item.IsActive,
                CreatedAt = item.CreatedAt,
                LastLogDate = lastLogDate,
                NextDueDate = nextDueDate,
                DaysOverdue = daysOverdue,
                DueStatus = dueStatus
            };
        }).ToList();

        var recentLogs = await _db.MaintenanceLogs
            .Include(l => l.Item)
            .ThenInclude(i => i.Category)
            .OrderByDescending(l => l.LogDate)
            .Take(10)
            .ToListAsync();

        var thisMonthCompleted = await _db.MaintenanceLogs
            .CountAsync(l => l.LogDate >= startOfMonth);

        var dashboard = new DashboardDto
        {
            TotalItems = items.Count,
            OverdueCount = itemDtos.Count(i => i.DueStatus == "overdue"),
            DueSoonCount = itemDtos.Count(i => i.DueStatus == "due-soon"),
            ThisMonthCompleted = thisMonthCompleted,
            OverdueItems = itemDtos.Where(i => i.DueStatus == "overdue").ToList(),
            DueSoonItems = itemDtos.Where(i => i.DueStatus == "due-soon").ToList(),
            RecentLogs = recentLogs.Select(log => new LogDto
            {
                Id = log.Id,
                ItemId = log.ItemId,
                ItemName = log.Item.Name,
                CategoryId = log.Item.CategoryId,
                CategoryName = log.Item.Category.Name,
                CategoryIcon = log.Item.Category.Icon,
                CategoryColor = log.Item.Category.Color,
                LogDate = log.LogDate,
                Notes = log.Notes,
                Cost = log.Cost,
                ProductUsed = log.ProductUsed,
                PhotoPath = log.PhotoPath,
                CreatedAt = log.CreatedAt
            }).ToList()
        };

        return Ok(dashboard);
    }
}
