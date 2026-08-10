using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Controllers;
using MyHome.API.DTOs;
using MyHome.API.Models;

namespace MyHome.API.Tests;

public class LogsControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly TempWebHostEnvironment _env = new();
    private readonly LogsController _controller;
    private readonly MaintenanceItem _item;
    private static readonly DateTime Today = DateTime.UtcNow.Date;

    public LogsControllerTests()
    {
        _controller = new LogsController(_db.Db, _env);
        _item = _db.AddItem("Mow lawn", categoryId: 1);
    }

    public void Dispose()
    {
        _db.Dispose();
        _env.Dispose();
    }

    private static IFormFile FakeFile(string name, string contentType, string content = "data")
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", name)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    // ---------- reads ----------

    [Fact]
    public async Task GetAll_ReturnsLogsNewestFirstWithItemAndCategory()
    {
        _db.AddLog(_item.Id, Today.AddDays(-10));
        _db.AddLog(_item.Id, Today.AddDays(-1));

        var result = await _controller.GetAll(itemId: null);

        var logs = result.OkValue<IEnumerable<LogDto>>().ToList();
        Assert.Equal(2, logs.Count);
        Assert.Equal(Today.AddDays(-1), logs[0].LogDate);
        Assert.Equal("Mow lawn", logs[0].ItemName);
        Assert.Equal("잔디/정원", logs[0].CategoryName);
    }

    [Fact]
    public async Task GetAll_WithItemId_FiltersToThatItem()
    {
        var other = _db.AddItem("Other item");
        _db.AddLog(_item.Id, Today);
        _db.AddLog(other.Id, Today);

        var result = await _controller.GetAll(itemId: other.Id);

        var log = Assert.Single(result.OkValue<IEnumerable<LogDto>>());
        Assert.Equal("Other item", log.ItemName);
    }

    [Fact]
    public async Task GetRecent_CapsAtTwenty()
    {
        for (var i = 0; i < 25; i++) _db.AddLog(_item.Id, Today.AddDays(-i));

        var result = await _controller.GetRecent();

        var logs = result.OkValue<IEnumerable<LogDto>>().ToList();
        Assert.Equal(20, logs.Count);
        Assert.Equal(Today, logs[0].LogDate);            // newest kept
        Assert.Equal(Today.AddDays(-19), logs[^1].LogDate); // oldest of the 20
    }

    // ---------- writes ----------

    [Fact]
    public async Task Create_PersistsLog()
    {
        var result = await _controller.Create(
            new CreateLogRequest(_item.Id, Today, "trimmed edges", 42.50m, "Scotts"));

        var dto = result.CreatedValue<LogDto>();
        Assert.Equal("trimmed edges", dto.Notes);
        Assert.Equal(42.50m, dto.Cost);
        Assert.Equal("Scotts", dto.ProductUsed);
        Assert.Equal("Mow lawn", dto.ItemName);

        await using var verify = _db.NewContext();
        Assert.Equal(42.50m, (await verify.MaintenanceLogs.SingleAsync(l => l.Id == dto.Id)).Cost);
    }

    [Fact]
    public async Task Create_ForUnknownItem_ReturnsBadRequest()
    {
        var result = await _controller.Create(new CreateLogRequest(9999, Today, null, null, null));

        Assert.IsType<BadRequestObjectResult>(result);

        await using var verify = _db.NewContext();
        Assert.Empty(verify.MaintenanceLogs);
    }

    [Fact]
    public async Task Update_ChangesEditableFields()
    {
        var log = _db.AddLog(_item.Id, Today.AddDays(-5), cost: 10m);

        var result = await _controller.Update(log.Id, new UpdateLogRequest(Today, "revised", 99m, "Brand X"));

        var dto = result.OkValue<LogDto>();
        Assert.Equal(Today, dto.LogDate);
        Assert.Equal("revised", dto.Notes);
        Assert.Equal(99m, dto.Cost);
        Assert.Equal("Brand X", dto.ProductUsed);
    }

    [Fact]
    public async Task Update_UnknownId_ReturnsNotFound()
    {
        var result = await _controller.Update(9999, new UpdateLogRequest(Today, null, null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_RemovesLogAndItsAttachmentRows()
    {
        var log = _db.AddLog(_item.Id, Today);
        await _controller.UploadAttachment(log.Id, FakeFile("manual.pdf", "application/pdf"));

        var result = await _controller.Delete(log.Id);

        Assert.IsType<NoContentResult>(result);

        await using var verify = _db.NewContext();
        Assert.Empty(verify.MaintenanceLogs);
        Assert.Empty(verify.LogAttachments);
    }

    [Fact]
    public async Task Delete_AlsoRemovesTheFileFromDisk()
    {
        var log = _db.AddLog(_item.Id, Today);
        var attachment = (await _controller.UploadAttachment(log.Id, FakeFile("manual.pdf", "application/pdf")))
            .OkValue<LogAttachmentDto>();
        var onDisk = Path.Combine(_env.WebRootPath, attachment.FilePath.TrimStart('/'));
        Assert.True(File.Exists(onDisk));

        await _controller.Delete(log.Id);

        Assert.False(File.Exists(onDisk));
    }

    [Fact]
    public async Task Delete_UnknownId_ReturnsNotFound()
    {
        var result = await _controller.Delete(9999);

        Assert.IsType<NotFoundResult>(result);
    }

    // ---------- uploads ----------

    [Fact]
    public async Task UploadPhoto_StoresFileAndSetsPhotoPath()
    {
        var log = _db.AddLog(_item.Id, Today);

        var result = await _controller.UploadPhoto(log.Id, FakeFile("before.jpg", "image/jpeg"));

        Assert.IsType<OkObjectResult>(result);

        await using var verify = _db.NewContext();
        var stored = await verify.MaintenanceLogs.SingleAsync(l => l.Id == log.Id);
        Assert.NotNull(stored.PhotoPath);
        Assert.StartsWith("/photos/", stored.PhotoPath);
        Assert.EndsWith(".jpg", stored.PhotoPath);   // original extension preserved
        Assert.True(File.Exists(Path.Combine(_env.WebRootPath, stored.PhotoPath!.TrimStart('/'))));
    }

    [Fact]
    public async Task UploadPhoto_ForUnknownLog_ReturnsNotFound()
    {
        var result = await _controller.UploadPhoto(9999, FakeFile("x.jpg", "image/jpeg"));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UploadPhoto_WithEmptyFile_ReturnsBadRequest()
    {
        var log = _db.AddLog(_item.Id, Today);

        var result = await _controller.UploadPhoto(log.Id, FakeFile("x.jpg", "image/jpeg", content: ""));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UploadAttachment_StoresFileAndKeepsOriginalName()
    {
        var log = _db.AddLog(_item.Id, Today);

        var result = await _controller.UploadAttachment(log.Id, FakeFile("receipt.pdf", "application/pdf"));

        var dto = result.OkValue<LogAttachmentDto>();
        Assert.Equal("receipt.pdf", dto.FileName);        // display name is the original
        Assert.StartsWith("/uploads/", dto.FilePath);
        Assert.DoesNotContain("receipt", dto.FilePath);    // stored under a generated name
        Assert.Equal("application/pdf", dto.MimeType);
        Assert.False(dto.IsImage);
    }

    [Fact]
    public async Task UploadAttachment_MarksImageMimeTypes()
    {
        var log = _db.AddLog(_item.Id, Today);

        var result = await _controller.UploadAttachment(log.Id, FakeFile("photo.png", "image/png"));

        Assert.True(result.OkValue<LogAttachmentDto>().IsImage);
    }

    [Fact]
    public async Task UploadAttachment_GivesEachUploadADistinctPath()
    {
        var log = _db.AddLog(_item.Id, Today);

        var first = (await _controller.UploadAttachment(log.Id, FakeFile("same.pdf", "application/pdf")))
            .OkValue<LogAttachmentDto>();
        var second = (await _controller.UploadAttachment(log.Id, FakeFile("same.pdf", "application/pdf")))
            .OkValue<LogAttachmentDto>();

        Assert.NotEqual(first.FilePath, second.FilePath);   // same filename must not overwrite
    }

    [Fact]
    public async Task Log_ExposesItsAttachments()
    {
        var log = _db.AddLog(_item.Id, Today);
        await _controller.UploadAttachment(log.Id, FakeFile("a.pdf", "application/pdf"));
        await _controller.UploadAttachment(log.Id, FakeFile("b.png", "image/png"));

        var result = await _controller.GetAll(itemId: null);

        var dto = Assert.Single(result.OkValue<IEnumerable<LogDto>>());
        Assert.Equal(2, dto.Attachments.Count);
        Assert.Contains(dto.Attachments, a => a.FileName == "a.pdf");
        Assert.Contains(dto.Attachments, a => a.FileName == "b.png" && a.IsImage);
    }

    [Fact]
    public async Task DeleteAttachment_RemovesRowAndFile()
    {
        var log = _db.AddLog(_item.Id, Today);
        var dto = (await _controller.UploadAttachment(log.Id, FakeFile("gone.pdf", "application/pdf")))
            .OkValue<LogAttachmentDto>();
        var onDisk = Path.Combine(_env.WebRootPath, dto.FilePath.TrimStart('/'));

        var result = await _controller.DeleteAttachment(log.Id, dto.Id);

        Assert.IsType<NoContentResult>(result);
        Assert.False(File.Exists(onDisk));

        await using var verify = _db.NewContext();
        Assert.Empty(verify.LogAttachments);
    }

    [Fact]
    public async Task DeleteAttachment_WithMismatchedLogId_ReturnsNotFound()
    {
        var log = _db.AddLog(_item.Id, Today);
        var otherLog = _db.AddLog(_item.Id, Today);
        var dto = (await _controller.UploadAttachment(log.Id, FakeFile("keep.pdf", "application/pdf")))
            .OkValue<LogAttachmentDto>();

        // Attachment exists, but not under otherLog — must not be deletable through it.
        var result = await _controller.DeleteAttachment(otherLog.Id, dto.Id);

        Assert.IsType<NotFoundResult>(result);

        await using var verify = _db.NewContext();
        Assert.True(await verify.LogAttachments.AnyAsync(a => a.Id == dto.Id));
    }
}
