using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Data;
using MyHome.API.DTOs;
using MyHome.API.Models;

namespace MyHome.API.Controllers;

[ApiController]
[Route("api/logs")]
[Authorize]
public class LogsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public LogsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private static LogDto MapToDto(MaintenanceLog log) => new()
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
        Attachments = log.Attachments.Select(a => new LogAttachmentDto
        {
            Id = a.Id,
            FileName = a.FileName,
            FilePath = a.FilePath,
            MimeType = a.MimeType
        }).ToList(),
        CreatedAt = log.CreatedAt
    };

    private IQueryable<MaintenanceLog> LogsWithIncludes() =>
        _db.MaintenanceLogs
            .Include(l => l.Item).ThenInclude(i => i.Category)
            .Include(l => l.Attachments);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? itemId)
    {
        var query = LogsWithIncludes().AsQueryable();

        if (itemId.HasValue)
            query = query.Where(l => l.ItemId == itemId.Value);

        var logs = await query
            .OrderByDescending(l => l.LogDate)
            .ToListAsync();

        return Ok(logs.Select(MapToDto));
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent()
    {
        var logs = await LogsWithIncludes()
            .OrderByDescending(l => l.LogDate)
            .Take(20)
            .ToListAsync();

        return Ok(logs.Select(MapToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLogRequest req)
    {
        var item = await _db.MaintenanceItems.FindAsync(req.ItemId);
        if (item == null) return BadRequest(new { message = "Item not found" });

        var log = new MaintenanceLog
        {
            ItemId = req.ItemId,
            LogDate = req.LogDate,
            Notes = req.Notes,
            Cost = req.Cost,
            ProductUsed = req.ProductUsed,
            CreatedAt = DateTime.UtcNow
        };

        _db.MaintenanceLogs.Add(log);
        await _db.SaveChangesAsync();

        var created = await LogsWithIncludes().FirstAsync(l => l.Id == log.Id);
        return CreatedAtAction(nameof(GetAll), MapToDto(created));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLogRequest req)
    {
        var log = await _db.MaintenanceLogs.FindAsync(id);
        if (log == null) return NotFound();

        log.LogDate = req.LogDate;
        log.Notes = req.Notes;
        log.Cost = req.Cost;
        log.ProductUsed = req.ProductUsed;

        await _db.SaveChangesAsync();

        var updated = await LogsWithIncludes().FirstAsync(l => l.Id == id);
        return Ok(MapToDto(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var log = await _db.MaintenanceLogs.Include(l => l.Attachments).FirstOrDefaultAsync(l => l.Id == id);
        if (log == null) return NotFound();

        // Delete attachment files from disk
        foreach (var att in log.Attachments)
        {
            var fullPath = Path.Combine(_env.WebRootPath, att.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);
        }

        _db.MaintenanceLogs.Remove(log);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/photo")]
    public async Task<IActionResult> UploadPhoto(int id, IFormFile photo)
    {
        var log = await _db.MaintenanceLogs.FindAsync(id);
        if (log == null) return NotFound();

        if (photo == null || photo.Length == 0)
            return BadRequest(new { message = "No photo provided" });

        var photosDir = Path.Combine(_env.WebRootPath, "photos");
        Directory.CreateDirectory(photosDir);

        var ext = Path.GetExtension(photo.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(photosDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await photo.CopyToAsync(stream);
        }

        log.PhotoPath = $"/photos/{fileName}";
        await _db.SaveChangesAsync();

        return Ok(new { photoPath = log.PhotoPath });
    }

    [HttpPost("{id}/attachments")]
    public async Task<IActionResult> UploadAttachment(int id, IFormFile file)
    {
        var log = await _db.MaintenanceLogs.FindAsync(id);
        if (log == null) return NotFound();

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided" });

        var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName);
        var savedName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, savedName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new LogAttachment
        {
            LogId = id,
            FileName = file.FileName,
            FilePath = $"/uploads/{savedName}",
            MimeType = file.ContentType,
            CreatedAt = DateTime.UtcNow
        };

        _db.LogAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        return Ok(new LogAttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            FilePath = attachment.FilePath,
            MimeType = attachment.MimeType
        });
    }

    [HttpDelete("{id}/attachments/{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(int id, int attachmentId)
    {
        var attachment = await _db.LogAttachments
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.LogId == id);
        if (attachment == null) return NotFound();

        var fullPath = Path.Combine(_env.WebRootPath, attachment.FilePath.TrimStart('/'));
        if (System.IO.File.Exists(fullPath))
            System.IO.File.Delete(fullPath);

        _db.LogAttachments.Remove(attachment);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
