using MyHome.API.Controllers;
using MyHome.API.DTOs;

namespace MyHome.API.Tests;

public class DashboardControllerTests : IDisposable
{
    private readonly TestDb _db = new();
    private readonly DashboardController _controller;
    private static readonly DateTime Today = DateTime.UtcNow.Date;

    public DashboardControllerTests() => _controller = new DashboardController(_db.Db);

    public void Dispose() => _db.Dispose();

    private async Task<DashboardDto> GetAsync() =>
        (await _controller.Get()).OkValue<DashboardDto>();

    [Fact]
    public async Task Get_OnEmptyDatabase_ReturnsZeroes()
    {
        var dash = await GetAsync();

        Assert.Equal(0, dash.TotalItems);
        Assert.Equal(0, dash.OverdueCount);
        Assert.Equal(0, dash.DueSoonCount);
        Assert.Equal(0, dash.ThisMonthCompleted);
        Assert.Empty(dash.RecentLogs);
    }

    [Fact]
    public async Task TotalItems_CountsOnlyActiveItems()
    {
        _db.AddItem("active one");
        _db.AddItem("active two");
        _db.AddItem("retired", isActive: false);

        var dash = await GetAsync();

        Assert.Equal(2, dash.TotalItems);
    }

    [Fact]
    public async Task InactiveItems_AreExcludedFromOverdueEvenWhenPastDue()
    {
        var retired = _db.AddItem("retired", intervalDays: 30, isActive: false);
        _db.AddLog(retired.Id, Today.AddDays(-100));

        var dash = await GetAsync();

        Assert.Equal(0, dash.OverdueCount);
        Assert.Empty(dash.OverdueItems);
    }

    [Fact]
    public async Task Counts_SplitItemsAcrossOverdueAndDueSoon()
    {
        var overdue = _db.AddItem("overdue", intervalDays: 30);
        _db.AddLog(overdue.Id, Today.AddDays(-45));        // diff = +15

        var dueSoon = _db.AddItem("due soon", intervalDays: 30);
        _db.AddLog(dueSoon.Id, Today.AddDays(-27));        // diff = -3

        var fine = _db.AddItem("fine", intervalDays: 30);
        _db.AddLog(fine.Id, Today.AddDays(-1));            // diff = -29

        _db.AddItem("never logged", intervalDays: 30);     // no-logs

        var dash = await GetAsync();

        Assert.Equal(4, dash.TotalItems);
        Assert.Equal(1, dash.OverdueCount);
        Assert.Equal(1, dash.DueSoonCount);

        Assert.Equal("overdue", Assert.Single(dash.OverdueItems).Name);
        Assert.Equal(15, dash.OverdueItems[0].DaysOverdue);
        Assert.Equal("due soon", Assert.Single(dash.DueSoonItems).Name);
    }

    [Fact]
    public async Task ThisMonthCompleted_CountsLogsFromTheFirstOfTheMonthOnward()
    {
        var item = _db.AddItem(intervalDays: 30);
        var startOfMonth = new DateTime(Today.Year, Today.Month, 1);

        _db.AddLog(item.Id, startOfMonth);                  // inclusive lower bound
        _db.AddLog(item.Id, startOfMonth.AddDays(-1));      // previous month
        _db.AddLog(item.Id, startOfMonth.AddMonths(-3));    // well before

        var dash = await GetAsync();

        Assert.Equal(1, dash.ThisMonthCompleted);
    }

    [Fact]
    public async Task RecentLogs_AreNewestFirstAndCappedAtTen()
    {
        var item = _db.AddItem("Mow lawn", categoryId: 1);
        for (var i = 0; i < 15; i++) _db.AddLog(item.Id, Today.AddDays(-i));

        var dash = await GetAsync();

        Assert.Equal(10, dash.RecentLogs.Count);
        Assert.Equal(Today, dash.RecentLogs[0].LogDate);
        Assert.Equal(Today.AddDays(-9), dash.RecentLogs[^1].LogDate);
    }

    [Fact]
    public async Task RecentLogs_CarryItemAndCategoryDetails()
    {
        var item = _db.AddItem("Oil change", categoryId: 2);
        _db.AddLog(item.Id, Today, cost: 79.99m);

        var dash = await GetAsync();

        var log = Assert.Single(dash.RecentLogs);
        Assert.Equal("Oil change", log.ItemName);
        Assert.Equal(2, log.CategoryId);
        Assert.Equal("자동차", log.CategoryName);
        Assert.Equal("🚗", log.CategoryIcon);
        Assert.Equal(79.99m, log.Cost);
    }

    [Fact]
    public async Task RecentLogs_IncludeLogsFromInactiveItems()
    {
        // Items are filtered by IsActive, the recent-log feed is not.
        var retired = _db.AddItem("retired", isActive: false);
        _db.AddLog(retired.Id, Today);

        var dash = await GetAsync();

        Assert.Equal(0, dash.TotalItems);
        Assert.Single(dash.RecentLogs);
    }
}
