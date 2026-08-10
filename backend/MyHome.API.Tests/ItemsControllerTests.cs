using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MyHome.API.Controllers;
using MyHome.API.DTOs;

namespace MyHome.API.Tests;

public class ItemsControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly ItemsController _controller;
    private static readonly DateTime Today = DateTime.UtcNow.Date;

    public ItemsControllerTests() => _controller = new ItemsController(_db.Db);

    public void Dispose() => _db.Dispose();

    private async Task<ItemDto> SingleItemAsync()
    {
        var result = await _controller.GetAll();
        return Assert.Single(result.OkValue<IEnumerable<ItemDto>>());
    }

    // ---------- due status ----------
    // nextDue = lastLog + intervalDays; diff = today - nextDue.
    // diff > 0 => overdue, diff in [-7, 0] => due-soon, diff < -7 => ok.

    [Fact]
    public async Task ItemWithNoLogs_IsNoLogs()
    {
        _db.AddItem(intervalDays: 30);

        var dto = await SingleItemAsync();

        Assert.Equal("no-logs", dto.DueStatus);
        Assert.Null(dto.LastLogDate);
        Assert.Null(dto.NextDueDate);
        Assert.Null(dto.DaysOverdue);
    }

    [Fact]
    public async Task ItemWithLogsButNoInterval_IsOk_AndHasNoDueDate()
    {
        var item = _db.AddItem(intervalDays: null);
        _db.AddLog(item.Id, Today.AddDays(-500));

        var dto = await SingleItemAsync();

        Assert.Equal("ok", dto.DueStatus);
        Assert.Equal(Today.AddDays(-500), dto.LastLogDate);
        Assert.Null(dto.NextDueDate);
    }

    [Fact]
    public async Task DueExactlyToday_IsDueSoon()
    {
        var item = _db.AddItem(intervalDays: 30);
        _db.AddLog(item.Id, Today.AddDays(-30));   // diff = 0

        var dto = await SingleItemAsync();

        Assert.Equal("due-soon", dto.DueStatus);
        Assert.Null(dto.DaysOverdue);
        Assert.Equal(Today, dto.NextDueDate);
    }

    [Fact]
    public async Task OneDayPastDue_IsOverdueByOneDay()
    {
        var item = _db.AddItem(intervalDays: 30);
        _db.AddLog(item.Id, Today.AddDays(-31));   // diff = 1

        var dto = await SingleItemAsync();

        Assert.Equal("overdue", dto.DueStatus);
        Assert.Equal(1, dto.DaysOverdue);
    }

    [Fact]
    public async Task SevenDaysBeforeDue_IsStillDueSoon()
    {
        var item = _db.AddItem(intervalDays: 30);
        _db.AddLog(item.Id, Today.AddDays(-23));   // diff = -7, the inclusive edge

        var dto = await SingleItemAsync();

        Assert.Equal("due-soon", dto.DueStatus);
    }

    [Fact]
    public async Task EightDaysBeforeDue_IsOk()
    {
        var item = _db.AddItem(intervalDays: 30);
        _db.AddLog(item.Id, Today.AddDays(-22));   // diff = -8, just outside the window

        var dto = await SingleItemAsync();

        Assert.Equal("ok", dto.DueStatus);
        Assert.Null(dto.DaysOverdue);
    }

    [Fact]
    public async Task DueStatus_UsesMostRecentLog_NotInsertionOrder()
    {
        var item = _db.AddItem(intervalDays: 30);
        _db.AddLog(item.Id, Today.AddDays(-200));  // stale, inserted first
        _db.AddLog(item.Id, Today.AddDays(-1));    // most recent

        var dto = await SingleItemAsync();

        Assert.Equal(Today.AddDays(-1), dto.LastLogDate);
        Assert.Equal("ok", dto.DueStatus);
    }

    [Fact]
    public async Task GetAll_IncludesCategoryDetailsAndInactiveItems()
    {
        _db.AddItem("Oil change", categoryId: 2, isActive: false);

        var dto = await SingleItemAsync();

        Assert.False(dto.IsActive);           // items list is not filtered by IsActive
        Assert.Equal(2, dto.CategoryId);
        Assert.Equal("자동차", dto.CategoryName);
        Assert.Equal("🚗", dto.CategoryIcon);
        Assert.Equal("blue", dto.CategoryColor);
    }

    [Fact]
    public async Task GetAll_OrdersByCategoryThenName()
    {
        _db.AddItem("Zebra", categoryId: 1);
        _db.AddItem("Apple", categoryId: 2);
        _db.AddItem("Alpha", categoryId: 1);

        var result = await _controller.GetAll();

        var names = result.OkValue<IEnumerable<ItemDto>>().Select(i => i.Name).ToList();
        Assert.Equal(new[] { "Alpha", "Zebra", "Apple" }, names);
    }

    // ---------- writes ----------

    [Fact]
    public async Task Create_PersistsItemAndDefaultsToActive()
    {
        var result = await _controller.Create(new CreateItemRequest(3, "Air filter", "every spring", 90));

        var dto = result.CreatedValue<ItemDto>();
        Assert.True(dto.Id > 0);
        Assert.True(dto.IsActive);
        Assert.Equal("no-logs", dto.DueStatus);
        Assert.Equal("집 내부", dto.CategoryName);

        await using var verify = _db.NewContext();
        var stored = await verify.MaintenanceItems.SingleAsync(i => i.Id == dto.Id);
        Assert.Equal("every spring", stored.Description);
        Assert.Equal(90, stored.IntervalDays);
    }

    [Fact]
    public async Task Update_ChangesFieldsAndRecomputesDueStatus()
    {
        var item = _db.AddItem("Old name", categoryId: 1, intervalDays: 365);
        _db.AddLog(item.Id, Today.AddDays(-30));

        var result = await _controller.Update(item.Id, new UpdateItemRequest(2, "New name", "note", 10, false));

        var dto = result.OkValue<ItemDto>();
        Assert.Equal("New name", dto.Name);
        Assert.Equal(2, dto.CategoryId);
        Assert.False(dto.IsActive);
        // interval dropped 365 -> 10, so a 30-day-old log is now 20 days overdue
        Assert.Equal("overdue", dto.DueStatus);
        Assert.Equal(20, dto.DaysOverdue);
    }

    [Fact]
    public async Task Update_UnknownId_ReturnsNotFound()
    {
        var result = await _controller.Update(9999, new UpdateItemRequest(1, "x", null, null, true));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_RemovesItem()
    {
        var item = _db.AddItem();

        var result = await _controller.Delete(item.Id);

        Assert.IsType<NoContentResult>(result);

        await using var verify = _db.NewContext();
        Assert.False(await verify.MaintenanceItems.AnyAsync(i => i.Id == item.Id));
    }

    [Fact]
    public async Task Delete_UnknownId_ReturnsNotFound()
    {
        var result = await _controller.Delete(9999);

        Assert.IsType<NotFoundResult>(result);
    }
}
