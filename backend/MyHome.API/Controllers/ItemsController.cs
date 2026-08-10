using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.DTOs;
using MyHome.API.Models;

namespace MyHome.API.Controllers;

[ApiController]
[Route("api/items")]
[Authorize]
public class ItemsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ItemsController(AppDbContext db) => _db = db;

    private ItemDto MapToDto(MaintenanceItem item, DateTime today)
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
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var today = DateTime.UtcNow.Date;
        var items = await _db.MaintenanceItems
            .Include(i => i.Category)
            .Include(i => i.Logs)
            .OrderBy(i => i.CategoryId)
            .ThenBy(i => i.Name)
            .ToListAsync();

        return Ok(items.Select(i => MapToDto(i, today)));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateItemRequest req)
    {
        var item = new MaintenanceItem
        {
            CategoryId = req.CategoryId,
            Name = req.Name,
            Description = req.Description,
            IntervalDays = req.IntervalDays,
            CreatedAt = DateTime.UtcNow
        };
        _db.MaintenanceItems.Add(item);
        await _db.SaveChangesAsync();

        var created = await _db.MaintenanceItems
            .Include(i => i.Category)
            .Include(i => i.Logs)
            .FirstAsync(i => i.Id == item.Id);

        return CreatedAtAction(nameof(GetAll), MapToDto(created, DateTime.UtcNow.Date));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateItemRequest req)
    {
        var item = await _db.MaintenanceItems.FindAsync(id);
        if (item == null) return NotFound();

        item.CategoryId = req.CategoryId;
        item.Name = req.Name;
        item.Description = req.Description;
        item.IntervalDays = req.IntervalDays;
        item.IsActive = req.IsActive;

        await _db.SaveChangesAsync();

        var updated = await _db.MaintenanceItems
            .Include(i => i.Category)
            .Include(i => i.Logs)
            .FirstAsync(i => i.Id == id);

        return Ok(MapToDto(updated, DateTime.UtcNow.Date));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var item = await _db.MaintenanceItems.FindAsync(id);
        if (item == null) return NotFound();
        _db.MaintenanceItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
